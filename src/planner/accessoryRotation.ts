import type { AccessoryCandidate } from "../lib/db";

function daysSince(dateString?: string | null): number {
  if (!dateString) return 9999;

  const then = new Date(dateString).getTime();
  const now = Date.now();
  const diff = now - then;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function scoreCandidate(candidate: AccessoryCandidate): number {
  const priority = candidate.accessory_priority ?? 5;
  const recencyDays = daysSince(candidate.last_used_at);

  return priority * 10 + Math.min(recencyDays, 30);
}

export function chooseAccessoryCandidate(
  candidates: AccessoryCandidate[],
  excludedNames: string[] = []
): { candidate: AccessoryCandidate | null; reason: string } {
  const filtered = candidates.filter(
    (candidate) => !excludedNames.includes(candidate.name)
  );

  const usable = filtered.length > 0 ? filtered : candidates;

  if (usable.length === 0) {
    return {
      candidate: null,
      reason: "No matching accessory candidates were found.",
    };
  }

  const ranked = [...usable].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  const chosen = ranked[0];

  const priority = chosen.accessory_priority ?? 5;
  const recency = chosen.last_used_at
    ? `${daysSince(chosen.last_used_at)} day(s) ago`
    : "not used before";

  const usedFallback = filtered.length === 0;
  const excludedPreview =
    excludedNames.length > 0 ? excludedNames.slice(0, 3).join(", ") : "";

  return {
    candidate: chosen,
    reason: usedFallback
      ? `Fallback used because all matching candidates were recently used or already chosen. Selected ${chosen.name} (priority ${priority}, last used ${recency}).`
      : excludedNames.length > 0
      ? `Recently avoided: ${excludedPreview}. Selected ${chosen.name} because it matched the slot/filter, has priority ${priority}, and was last used ${recency}.`
      : `Selected ${chosen.name} because it matched the slot/filter, has priority ${priority}, and was last used ${recency}.`,
  };
}