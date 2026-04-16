import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const START_URL =
  process.env.MMH_START_URL ||
  "https://www.modernmeathead.com/products/exercise-library/";
const EMAIL = (
  process.env.MMH_EMAIL ||
  process.env.MMHEMAIL ||
  process.env.MMH_EMAIL_ADDRESS ||
  ""
).trim();
const PASSWORD = (
  process.env.MMH_PASSWORD ||
  process.env.MMHPASSWORD ||
  process.env.MMH_PASS ||
  ""
).trim();
const OUTPUT_FILE = process.env.MMH_OUTPUT || "modernmeathead_exercises.csv";
const HEADLESS = (process.env.MMH_HEADLESS || "false").toLowerCase() === "true";
const DEBUG_DIR = process.env.MMH_DEBUG_DIR || "scrape-debug";

function csvEscape(value) {
  const str = String(value ?? "");
  const escaped = str.replaceAll('"', '""');
  return `"${escaped}"`;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      try {
        if (await locator.isVisible()) {
          await locator.fill(value);
          return true;
        }
      } catch {
        // Ignore and keep trying other selectors.
      }
    }
  }
  return false;
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      try {
        if (await locator.isVisible()) {
          await locator.click();
          return true;
        }
      } catch {
        // Ignore and keep trying other selectors.
      }
    }
  }
  return false;
}

async function saveLoginDebug(page, reason) {
  const dir = path.resolve(process.cwd(), DEBUG_DIR);
  await fs.mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const htmlPath = path.join(dir, `login-debug-${stamp}.html`);
  const shotPath = path.join(dir, `login-debug-${stamp}.png`);

  await fs.writeFile(htmlPath, await page.content(), "utf8");
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  throw new Error(`${reason} (saved debug files: ${htmlPath}, ${shotPath})`);
}

async function navigateToLikelyLoginPage(page) {
  const clickedLoginLink = await clickFirstVisible(page, [
    'a:has-text("Log in")',
    'a:has-text("Login")',
    'a:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
  ]);

  if (clickedLoginLink) {
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
    return;
  }

  const origin = new URL(START_URL).origin;
  const candidates = [
    `${origin}/login`,
    `${origin}/my-account`,
    `${origin}/account/login`,
    `${origin}/wp-login.php`,
  ];

  for (const url of candidates) {
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
    const hasPassword = await page.locator('input[type="password"]').count();
    if (hasPassword > 0) return;
  }
}

async function loginIfNeeded(page) {
  await page.goto(START_URL, { waitUntil: "domcontentloaded" });

  const lowerUrl = page.url().toLowerCase();
  const likelyOnLibrary = lowerUrl.includes("/products/exercise-library");
  if (likelyOnLibrary) return;

  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Login appears required, but credentials were not found. Set MMH_EMAIL and MMH_PASSWORD (PowerShell: $env:MMH_EMAIL='you@example.com'; $env:MMH_PASSWORD='your-password')."
    );
  }

  await navigateToLikelyLoginPage(page);

  const emailFilled = await fillFirstVisible(
    page,
    [
      'input[type="email"]',
      'input[name="email"]',
      'input[name*="email"]',
      'input[name="username"]',
      'input[name*="user"]',
      'input[autocomplete="username"]',
      'input[placeholder*="Email" i]',
      '#username',
      '#user_login',
    ],
    EMAIL
  );

  const passwordFilled = await fillFirstVisible(
    page,
    [
      'input[type="password"]',
      'input[name="password"]',
      'input[name*="pass"]',
      'input[autocomplete="current-password"]',
      '#password',
      '#user_pass',
    ],
    PASSWORD
  );

  if (!emailFilled || !passwordFilled) {
    await saveLoginDebug(page, "Could not find login form fields on page.");
  }

  const clicked = await clickFirstVisible(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Sign in")',
  ]);

  if (!clicked) {
    await page.keyboard.press("Enter");
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.goto(START_URL, { waitUntil: "domcontentloaded" });
}

async function extractModulesFromCurrentPage(page) {
  const origin = new URL(START_URL).origin;
  const moduleRows = await page.evaluate((siteOrigin) => {
    const badPhrases = [
      "home",
      "login",
      "log in",
      "sign in",
      "my account",
      "cart",
      "checkout",
      "privacy",
      "terms",
      "contact",
      "about",
    ];

    function inIgnoredUi(link) {
      return Boolean(link.closest("header, nav, footer"));
    }

    function isAllowedLink(url) {
      try {
        const u = new URL(url);
        if (!u.toString().startsWith(siteOrigin)) return false;
        if (u.hash) return false;
        if (u.pathname === "/") return false;
        return true;
      } catch {
        return false;
      }
    }

    function isAllowedName(name) {
      const text = (name || "").trim();
      if (text.length < 2) return false;
      const lower = text.toLowerCase();
      return !badPhrases.includes(lower);
    }

    const rows = [];

    // Strategy 1: heading/container driven discovery.
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"));
    for (const heading of headings) {
      const moduleName = heading.textContent?.trim() || "";
      if (!isAllowedName(moduleName)) continue;

      const container = heading.closest("section, article, li, div") || heading.parentElement;
      if (!container) continue;

      const links = Array.from(container.querySelectorAll("a[href]"))
        .filter((a) => !inIgnoredUi(a))
        .map((a) => ({ name: a.textContent?.trim() || "", url: a.href }))
        .filter((a) => isAllowedName(a.name) && isAllowedLink(a.url));

      if (links.length === 0) continue;

      rows.push({ moduleName, moduleUrl: links[0].url });
    }

    if (rows.length > 0) return rows;

    // Strategy 2: fallback to main-content links (card/list style pages without headings).
    const mainRoot = document.querySelector("main") || document.body;
    const candidateLinks = Array.from(mainRoot.querySelectorAll("a[href]"))
      .filter((a) => !inIgnoredUi(a))
      .map((a) => ({
        moduleName: a.textContent?.trim() || "",
        moduleUrl: a.href,
      }))
      .filter((r) => isAllowedName(r.moduleName) && isAllowedLink(r.moduleUrl));

    return candidateLinks;
  }, origin);

  const byName = new Map();
  for (const row of moduleRows) {
    if (!row.moduleName) continue;
    const key = row.moduleName.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        moduleName: row.moduleName,
        moduleUrl: row.moduleUrl,
      });
    }
  }

  return Array.from(byName.values()).filter((m) => m.moduleUrl);
}

async function discoverModuleIndexPages(page) {
  const origin = new URL(START_URL).origin;
  const pageUrls = await page.evaluate((siteOrigin) => {
    function inIgnoredUi(link) {
      return Boolean(link.closest("header, nav, footer"));
    }

    function isModuleIndexUrl(url) {
      try {
        const u = new URL(url);
        if (!u.toString().startsWith(siteOrigin)) return false;
        if (!u.pathname.includes("/products/exercise-library/categories")) return false;
        if (/\/categories\/\d+/.test(u.pathname)) return false;
        return true;
      } catch {
        return false;
      }
    }

    const urls = Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => !inIgnoredUi(a))
      .map((a) => a.href)
      .filter((href) => isModuleIndexUrl(href));

    return Array.from(new Set(urls));
  }, origin);

  const normalized = new Set([
    normalizeUrl(page.url()),
    ...pageUrls.map((url) => normalizeUrl(url)),
  ]);

  return Array.from(normalized);
}

function buildPagedModuleIndexUrls(baseUrl, pageNumber) {
  const candidates = [];

  try {
    const withQuery = new URL(baseUrl);
    withQuery.searchParams.set("page", String(pageNumber));
    candidates.push(normalizeUrl(withQuery.toString()));

    const withPagedPath = new URL(baseUrl);
    const trimmedPath = withPagedPath.pathname.endsWith("/")
      ? withPagedPath.pathname.slice(0, -1)
      : withPagedPath.pathname;
    withPagedPath.pathname = `${trimmedPath}/page/${pageNumber}`;
    withPagedPath.search = "";
    candidates.push(normalizeUrl(withPagedPath.toString()));
  } catch {
    return [];
  }

  return Array.from(new Set(candidates));
}

async function discoverModules(page) {
  const initialModuleIndexPages = await discoverModuleIndexPages(page);
  const moduleIndexPages = new Set(initialModuleIndexPages);
  const allModules = new Map();
  const visitedPages = new Set();

  const baseIndexCandidates = initialModuleIndexPages.length > 0
    ? initialModuleIndexPages
    : [normalizeUrl(page.url())];

  let emptyOrRepeatPageStreak = 0;

  for (const baseUrl of baseIndexCandidates) {
    for (let pageNumber = 2; pageNumber <= 12; pageNumber += 1) {
      const candidates = buildPagedModuleIndexUrls(baseUrl, pageNumber);
      let foundNewModulesOnThisPage = false;

      for (const candidateUrl of candidates) {
        if (moduleIndexPages.has(candidateUrl)) continue;

        await page.goto(candidateUrl, { waitUntil: "domcontentloaded" }).catch(() => {});

        const landedUrl = normalizeUrl(page.url());
        if (visitedPages.has(landedUrl)) continue;
        visitedPages.add(landedUrl);

        const pageModules = await extractModulesFromCurrentPage(page);
        if (pageModules.length === 0) {
          continue;
        }

        moduleIndexPages.add(landedUrl);

        for (const module of pageModules) {
          const key = module.moduleName.toLowerCase();
          if (!allModules.has(key)) {
            allModules.set(key, module);
            foundNewModulesOnThisPage = true;
          }
        }
      }

      if (foundNewModulesOnThisPage) {
        emptyOrRepeatPageStreak = 0;
      } else {
        emptyOrRepeatPageStreak += 1;
      }

      if (emptyOrRepeatPageStreak >= 2) {
        break;
      }
    }
  }

  for (const moduleIndexPage of moduleIndexPages) {
    await page.goto(moduleIndexPage, { waitUntil: "domcontentloaded" });
    const pageModules = await extractModulesFromCurrentPage(page);

    for (const module of pageModules) {
      const key = module.moduleName.toLowerCase();
      if (!allModules.has(key)) {
        allModules.set(key, module);
      }
    }
  }

  return Array.from(allModules.values());
}

async function extractExercisesFromModule(page, module) {
  await page.goto(module.moduleUrl, { waitUntil: "domcontentloaded" });

  const origin = new URL(module.moduleUrl).origin;
  const moduleUrl = module.moduleUrl;
  const rows = await page.evaluate(({ siteOrigin, currentModuleUrl }) => {
    const blockedExactLabels = [
      "home",
      "login",
      "log in",
      "sign in",
      "store",
      "contact",
      "my account",
      "my library",
      "settings",
      "logout",
      "exercise library",
      "modules",
      "cart",
      "checkout",
      "next",
      "previous",
    ];

    function inIgnoredUi(link) {
      return Boolean(link.closest("header, nav, footer"));
    }

    return Array.from(document.querySelectorAll("a[href]"))
      .filter((a) => !inIgnoredUi(a))
      .map((a) => {
        const name = (a.textContent || "").replace(/\s+/g, " ").trim();
        return {
          exerciseName: name,
          exerciseUrl: a.href,
        };
      })
      .filter((row) => {
        if (!row.exerciseName || row.exerciseName.length < 2) return false;
        if (!row.exerciseUrl || !row.exerciseUrl.startsWith("http")) return false;
        if (!row.exerciseUrl.startsWith(siteOrigin)) return false;
          if (!row.exerciseUrl.includes("/products/exercise-library/categories/")) return false;
          if (!row.exerciseUrl.includes("/posts/")) return false;
          if (row.exerciseUrl === currentModuleUrl) return false;

        const lowerName = row.exerciseName.toLowerCase();
          if (blockedExactLabels.includes(lowerName)) return false;

        return true;
      });
        }, { siteOrigin: origin, currentModuleUrl: moduleUrl });

  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key = `${row.exerciseName.toLowerCase()}|${normalizeUrl(row.exerciseUrl)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

async function writeCsv(outputPath, rows) {
  const header = [
    "module_name",
    "exercise_name",
    "exercise_url",
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.moduleName,
        row.exerciseName,
        row.exerciseUrl,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  await fs.writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Logging in and loading Exercise Library...");
    await loginIfNeeded(page);

    console.log("Discovering modules...");
    const discovered = await discoverModules(page);
    const modules = discovered.length > 0
      ? discovered
      : [{ moduleName: "Exercise Library", moduleUrl: START_URL }];

    if (discovered.length === 0) {
      console.log(
        "No explicit modules discovered. Falling back to scraping links directly from Exercise Library page."
      );
    }

    console.log(`Found ${modules.length} modules. Collecting exercises...`);
    const allRows = [];

    for (const module of modules) {
      const exercises = await extractExercisesFromModule(page, module);
      console.log(`- ${module.moduleName}: ${exercises.length} exercises`);

      for (const exercise of exercises) {
        allRows.push({
          moduleName: module.moduleName,
          moduleUrl: module.moduleUrl,
          exerciseName: exercise.exerciseName,
          exerciseUrl: exercise.exerciseUrl,
        });
      }
    }

    const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
    await writeCsv(outputPath, allRows);

    console.log(`Done. Wrote ${allRows.length} rows to ${outputPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Scrape failed:", err.message || err);
  process.exitCode = 1;
});
