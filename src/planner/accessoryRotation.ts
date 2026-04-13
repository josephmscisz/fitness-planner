type AccessoryCandidate = {
  id: number;
  name: string;
  category: string;
  equipment?: string | null;
  accessory_priority?: number | null;
  last_used_at?: string | null;
};

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

  // Higher priority should matter more.
  // Longer since last used should also matter more.
  return priority * 10 + Math.min(recencyDays, 30);
}

export function chooseAccessory(
  candidates: AccessoryCandidate[],
  recentlyUsedNames: string[] = []
): AccessoryCandidate | null {
  const filtered = candidates.filter(
    (c) => !recentlyUsedNames.includes(c.name)
  );

  if (filtered.length === 0) return candidates[0] ?? null;

  const ranked = [...filtered].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
  return ranked[0] ?? null;
}