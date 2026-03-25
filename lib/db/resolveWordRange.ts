/**
 * Cross-version word-range resolver.
 *
 * Given feedback anchored to (wordStart, wordEnd) in version A, traverses the
 * chapter_diffs chain to find the equivalent range in version B.
 *
 * Suitable for server-side use (API routes, server components).
 */

import { mapWordRange } from './wordPos';

interface Diff {
  chapter_version_id: string;
  previous_chapter_version_id: string | null;
  word_map: number[];
}

/**
 * Resolve a word range from `fromVersionId` to `toVersionId` by walking the
 * diff chain stored in `chapter_diffs`.
 *
 * `fetchDiffs` should return all diffs for the chapter, ordered by version_number.
 * Returns null if the anchored words no longer exist in the target version.
 */
export function resolveWordRange(
  diffs: Diff[],
  fromVersionId: string,
  toVersionId: string,
  wordStart: number,
  wordEnd: number,
): { wordStart: number; wordEnd: number } | null {
  if (fromVersionId === toVersionId) return { wordStart, wordEnd };

  // Build adjacency: version_id → diff that maps FROM its previous version TO it
  const diffByNewVersion = new Map<string, Diff>();
  for (const d of diffs) {
    diffByNewVersion.set(d.chapter_version_id, d);
  }

  // Collect the ordered chain of version IDs by walking prev pointers
  // Build a version order list
  const versionOrder: string[] = [];
  const prevOf = new Map<string, string | null>();
  for (const d of diffs) {
    prevOf.set(d.chapter_version_id, d.previous_chapter_version_id);
  }

  // Walk from toVersionId backwards to find fromVersionId, building the path
  const pathToTarget: string[] = [];
  const visited = new Set<string>();
  let cur: string | null = toVersionId;
  while (cur !== null) {
    if (visited.has(cur)) break; // cycle guard
    visited.add(cur);
    pathToTarget.unshift(cur);
    if (cur === fromVersionId) break;
    cur = prevOf.get(cur) ?? null;
  }

  if (pathToTarget[0] !== fromVersionId) {
    // fromVersionId not an ancestor of toVersionId — unsupported direction
    return null;
  }

  // Walk forward through the chain, applying each word map
  let range: { wordStart: number; wordEnd: number } = { wordStart, wordEnd };
  for (let i = 1; i < pathToTarget.length; i++) {
    const diff = diffByNewVersion.get(pathToTarget[i]);
    if (!diff?.word_map) return null;
    const mapped = mapWordRange(diff.word_map, range.wordStart, range.wordEnd);
    if (!mapped) return null; // words were deleted
    range = mapped;
  }

  return range;
}
