/**
 * Word-position utilities for cross-version feedback anchoring.
 *
 * All word indices are derived from htmlToTextContent(rendered_html) split on
 * whitespace — immune to markdown styling changes between versions.
 */

import { htmlToTextContent } from './charPos';

/** Split rendered HTML into the word array readers see. */
export function htmlToWords(html: string): string[] {
  return htmlToTextContent(html).split(/\s+/).filter(w => w.length > 0);
}

/** Normalize typographic quotes to ASCII so needle matching is quote-agnostic. */
function normalizeQuotes(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart single quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"'); // smart double quotes → straight
}

/**
 * Find the word-index range of `selectedText` within `renderedHtml`.
 * Matches by reconstructing substrings of the word array.
 * Quote-agnostic: smart quotes in the HTML match straight quotes in the needle.
 */
export function feedbackWordPos(
  renderedHtml: string,
  selectedText: string,
): { wordStart: number; wordEnd: number } | null {
  const words = htmlToWords(renderedHtml);
  const needle = normalizeQuotes(selectedText.trim());

  // Closing punctuation that may be attached to the last word in the HTML
  // but not included in the user's selected text
  const trailingClosePunct = /^["""''»)\]>!?.,;:\s]*$/;

  for (let i = 0; i < words.length; i++) {
    // Try joining increasing numbers of words until we match or overshoot
    let joined = '';
    for (let j = i; j < words.length; j++) {
      joined = j === i ? words[j] : joined + ' ' + words[j];
      const normJoined = normalizeQuotes(joined);
      if (normJoined === needle) return { wordStart: i, wordEnd: j };
      // Also match if the joined text starts with the needle and only has
      // trailing close-punctuation beyond it (e.g. closing curly quote attached to last word)
      if (normJoined.startsWith(needle) && trailingClosePunct.test(normJoined.slice(needle.length))) {
        return { wordStart: i, wordEnd: j };
      }
      if (joined.length > needle.length + 20) break;
    }
  }
  return null;
}

/**
 * Build a word alignment map from oldWords → newWords using LCS.
 *
 * Returns an array of length `newWords.length` where:
 *   result[newIndex] = oldIndex   (word carried over from old version)
 *   result[newIndex] = -1         (word is new in this version)
 */
export function buildWordMap(oldWords: string[], newWords: string[]): number[] {
  const m = oldWords.length;
  const n = newWords.length;

  // DP table for LCS lengths
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldWords[i - 1] === newWords[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to build newToOld map
  const newToOld = new Array(n).fill(-1);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldWords[i - 1] === newWords[j - 1]) {
      newToOld[j - 1] = i - 1;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return newToOld;
}

/**
 * Convert word-index anchors back into a char range within the rendered HTML's
 * text content. This is the inverse of feedbackWordPos — use it at write time
 * so the frontend can use stored char_start/char_length directly without any
 * runtime word→char conversion.
 */
export function wordRangeToCharPos(
  renderedHtml: string,
  wordStart: number,
  wordEnd: number,
): { charStart: number; charLength: number } | null {
  const text = htmlToTextContent(renderedHtml);
  let pos = 0;
  let wordCount = 0;
  let charStart = -1;
  let charEnd = -1;

  // skip leading whitespace
  while (pos < text.length && /\s/.test(text[pos])) pos++;

  while (pos < text.length && wordCount <= wordEnd) {
    const begin = pos;
    while (pos < text.length && !/\s/.test(text[pos])) pos++;
    const end = pos;

    if (wordCount === wordStart) charStart = begin;
    if (wordCount === wordEnd) charEnd = end;

    wordCount++;
    while (pos < text.length && /\s/.test(text[pos])) pos++;
  }

  if (charStart === -1 || charEnd === -1) return null;
  return { charStart, charLength: charEnd - charStart };
}

/**
 * Map a feedback word range from an old version into a new version using the
 * stored word map (new→old).
 *
 * Finds the new-version span that covers the same old-version words.
 * Returns null if all anchored words were deleted.
 */
export function mapWordRange(
  wordMap: number[],
  oldWordStart: number,
  oldWordEnd: number,
): { wordStart: number; wordEnd: number } | null {
  let newStart = -1;
  let newEnd = -1;

  for (let newIdx = 0; newIdx < wordMap.length; newIdx++) {
    const oldIdx = wordMap[newIdx];
    if (oldIdx >= oldWordStart && oldIdx <= oldWordEnd) {
      if (newStart === -1) newStart = newIdx;
      newEnd = newIdx;
    }
  }

  if (newStart === -1) return null;
  return { wordStart: newStart, wordEnd: newEnd };
}
