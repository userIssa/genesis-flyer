import type { Celebrant } from "./models";

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "") // strip extension
    .replace(/[_\-.]+/g, " ")
    .replace(/\d+/g, " ") // strip stray numbers (IMG_2031 etc.)
    .split(/\s+/)
    .filter(Boolean);
}

// Token-overlap score: how many words the filename and the celebrant's name
// share, in either order — handles "Rose Henry.jpg" matching "Henry Rose".
function scoreMatch(filenameTokens: string[], nameTokens: string[]): number {
  const nameSet = new Set(nameTokens);
  const shared = filenameTokens.filter((t) => nameSet.has(t)).length;
  if (shared === 0) return 0;
  return shared / Math.max(nameSet.size, filenameTokens.length);
}

export type PhotoMatchResult = {
  celebrantId: string;
  filename: string;
  score: number;
};

const AUTO_ACCEPT_THRESHOLD = 0.6;

/**
 * Given a list of uploaded filenames and the session's celebrants, returns the
 * best filename match per celebrant. Matches scoring below the threshold are
 * left out so the UI can prompt the user to assign them manually instead of
 * silently pairing the wrong photo with the wrong name.
 */
export function autoMatchPhotos(
  filenames: string[],
  celebrants: Pick<Celebrant, "_id" | "name">[]
): { matches: PhotoMatchResult[]; unmatchedFilenames: string[]; unmatchedCelebrantIds: string[] } {
  const matches: PhotoMatchResult[] = [];
  const usedFilenames = new Set<string>();

  for (const celebrant of celebrants) {
    const nameTokens = normalize(celebrant.name);
    let best: { filename: string; score: number } | null = null;

    for (const filename of filenames) {
      if (usedFilenames.has(filename)) continue;
      const score = scoreMatch(normalize(filename), nameTokens);
      if (score >= AUTO_ACCEPT_THRESHOLD && (!best || score > best.score)) {
        best = { filename, score };
      }
    }

    if (best) {
      matches.push({ celebrantId: celebrant._id as string, filename: best.filename, score: best.score });
      usedFilenames.add(best.filename);
    }
  }

  const matchedCelebrantIds = new Set(matches.map((m) => m.celebrantId));
  return {
    matches,
    unmatchedFilenames: filenames.filter((f) => !usedFilenames.has(f)),
    unmatchedCelebrantIds: celebrants
      .filter((c) => !matchedCelebrantIds.has(c._id as string))
      .map((c) => c._id as string),
  };
}
