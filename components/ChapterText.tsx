'use client';

import { useRef, useLayoutEffect, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

/* ─── Animation ──────────────────────────────────────────────────────────── */

const wordDiffIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(5px);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
`;

const StyledChapterText = styled.div`
  font-family: 'GenRyuMin2TW', 'Noto Serif SC', serif;
  line-height: 1.6;
  font-size: 1.125rem;
  color: #2a2a2a;
  position: relative;

  p {
    margin-bottom: 1rem;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  h1 {
    font-size: 2rem;
  }

  h2 {
    font-size: 1.75rem;
  }

  h3 {
    font-size: 1.5rem;
  }

  blockquote {
    border-left: 3px solid #e0e0e0;
    padding-left: 1.5rem;
    margin: 1rem 0;
    color: #666;
    font-style: italic;
  }

  strong {
    font-weight: 600;
  }

  em {
    font-style: italic;
  }

  code {
    background: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  pre code {
    background: none;
    padding: 0;
  }

  ul, ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  a {
    color: #1976d2;
    text-decoration: underline;
  }

  hr {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 2rem 0;
  }

  .word-changed {
    display: inline-block;
    animation: ${wordDiffIn} 0.45s ease-out both;
  }
`;

/* ─── Word-diff helpers ──────────────────────────────────────────────────── */

/** Simple string hash for cache keys */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) | 0;
  }
  return h >>> 0;
}

function htmlCacheKey(html: string): string {
  return `${fnv1a(html)}:${html.length}`;
}

/* ── Caches ───────────────────────────────────────────────────────────────
 *  • wordsCache  – in-memory only (DOM parsing can't be serialised)
 *  • diffCache   – localStorage-backed so diffs survive across sessions.
 *    Version HTML is deterministic (same commit SHA → same content), so
 *    a diff between two versions never goes stale.
 * ──────────────────────────────────────────────────────────────────────── */

const DIFF_LS_KEY = 'inklink:word-diffs';
const MAX_WORDS_CACHE = 60;
const MAX_DIFF_ENTRIES = 100;

/** In-memory word cache (not worth persisting — DOM parse is needed anyway) */
const wordsCache = new Map<string, string[]>();

function evictOldest(map: Map<string, unknown>, max: number) {
  if (map.size <= max) return;
  const first = map.keys().next().value;
  if (first !== undefined) map.delete(first);
}

/** Read the full diff store from localStorage once, then work in-memory */
let _diffMemory: Map<string, number[]> | null = null;

function diffStore(): Map<string, number[]> {
  if (_diffMemory) return _diffMemory;
  _diffMemory = new Map();
  try {
    const raw = localStorage.getItem(DIFF_LS_KEY);
    if (raw) {
      const parsed: Record<string, number[]> = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) _diffMemory.set(k, v);
    }
  } catch { /* localStorage unavailable or corrupt — start fresh */ }
  return _diffMemory;
}

function persistDiffStore() {
  try {
    const store = diffStore();
    const obj: Record<string, number[]> = {};
    for (const [k, v] of store) obj[k] = v;
    localStorage.setItem(DIFF_LS_KEY, JSON.stringify(obj));
  } catch { /* quota exceeded or unavailable — silent */ }
}

/** Extract plain-text words from an HTML string (in-memory cached) */
function extractWords(html: string): string[] {
  const key = htmlCacheKey(html);
  const hit = wordsCache.get(key);
  if (hit) return hit;

  const div = document.createElement('div');
  div.innerHTML = html;
  const words = (div.textContent || '').split(/\s+/).filter(Boolean);

  wordsCache.set(key, words);
  evictOldest(wordsCache, MAX_WORDS_CACHE);
  return words;
}

/**
 * Get changed-word indices between two HTML versions.
 * Looks up localStorage first; computes + persists on miss.
 */
function getChangedIndices(
  oldHtml: string,
  newHtml: string,
): Set<number> {
  const store = diffStore();
  const cacheKey = `${htmlCacheKey(oldHtml)}\0${htmlCacheKey(newHtml)}`;

  const hit = store.get(cacheKey);
  if (hit) return new Set(hit);

  const oldWords = extractWords(oldHtml);
  const newWords = extractWords(newHtml);
  const changed = computeChangedIndices(oldWords, newWords);

  const arr = [...changed].sort((a, b) => a - b);
  store.set(cacheKey, arr);

  // Evict oldest entries when over budget
  while (store.size > MAX_DIFF_ENTRIES) {
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
  }

  persistDiffStore();
  return changed;
}

function computeChangedIndices(
  oldWords: string[],
  newWords: string[],
): Set<number> {
  const n = oldWords.length;
  const m = newWords.length;

  // Trim common prefix
  let prefix = 0;
  while (prefix < n && prefix < m && oldWords[prefix] === newWords[prefix])
    prefix++;

  // Trim common suffix
  let suffix = 0;
  while (
    suffix < n - prefix &&
    suffix < m - prefix &&
    oldWords[n - 1 - suffix] === newWords[m - 1 - suffix]
  )
    suffix++;

  const oldMid = oldWords.slice(prefix, n - suffix);
  const newMid = newWords.slice(prefix, m - suffix);

  if (oldMid.length === 0 && newMid.length === 0) return new Set();

  // If middle is small enough, use full LCS
  if (oldMid.length * newMid.length <= 500_000) {
    const rows = oldMid.length + 1;
    const cols = newMid.length + 1;
    const dp: number[][] = [];
    for (let i = 0; i < rows; i++) dp[i] = new Array(cols).fill(0);

    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        dp[i][j] =
          oldMid[i - 1] === newMid[j - 1]
            ? dp[i - 1][j - 1] + 1
            : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    // Backtrack to find which new-middle indices are in the LCS
    const lcsIndices = new Set<number>();
    let i = oldMid.length,
      j = newMid.length;
    while (i > 0 && j > 0) {
      if (oldMid[i - 1] === newMid[j - 1]) {
        lcsIndices.add(j - 1);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    const changed = new Set<number>();
    for (let k = 0; k < newMid.length; k++) {
      if (!lcsIndices.has(k)) changed.add(k + prefix);
    }
    return changed;
  }

  // Fallback for huge diffs: mark entire middle as changed
  const changed = new Set<number>();
  for (let k = prefix; k < m - suffix; k++) changed.add(k);
  return changed;
}

/**
 * Walk the live DOM inside `container`, wrapping each changed word in
 * an animated <span>. Text nodes without changes are left untouched.
 */
function wrapChangedWords(
  container: HTMLElement,
  changedIndices: Set<number>,
) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  let wordIdx = 0;
  let delayIdx = 0;

  for (const node of textNodes) {
    const text = node.textContent || '';
    const parts = text.split(/(\s+)/);

    // Quick check: does this text node contain any changed word?
    let tempIdx = wordIdx;
    let hasChange = false;
    for (const part of parts) {
      if (part && !/^\s+$/.test(part)) {
        if (changedIndices.has(tempIdx)) {
          hasChange = true;
          break;
        }
        tempIdx++;
      }
    }

    if (!hasChange) {
      // Advance counter without touching the DOM
      for (const part of parts) {
        if (part && !/^\s+$/.test(part)) wordIdx++;
      }
      continue;
    }

    // Replace text node with wrapped fragments
    const fragment = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
      } else {
        if (changedIndices.has(wordIdx)) {
          const span = document.createElement('span');
          span.className = 'word-changed';
          span.style.animationDelay = `${delayIdx * 25}ms`;
          span.textContent = part;
          fragment.appendChild(span);
          delayIdx++;
        } else {
          fragment.appendChild(document.createTextNode(part));
        }
        wordIdx++;
      }
    }
    node.parentNode!.replaceChild(fragment, node);
  }
}

/* ─── useIsomorphicLayoutEffect ──────────────────────────────────────────── */

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ─── Component ──────────────────────────────────────────────────────────── */

interface ChapterTextProps {
  html: string;
  className?: string;
  onMouseUp?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onMouseOver?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
}

export default function ChapterText({
  html,
  className,
  onMouseUp,
  onClick,
  onMouseOver,
  onMouseOut,
}: ChapterTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevHtmlRef = useRef<string>('');

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Always set the new HTML first
    el.innerHTML = html;

    const oldHtml = prevHtmlRef.current;
    prevHtmlRef.current = html;

    // Skip animation on first render or when content is empty
    if (!oldHtml || !html || oldHtml === html) return;

    // getChangedIndices is cached — repeat switches are free
    const changed = getChangedIndices(oldHtml, html);
    const newWords = extractWords(html);

    // Only animate if a meaningful subset changed (not a chapter switch)
    if (changed.size > 0 && changed.size < newWords.length * 0.7) {
      wrapChangedWords(el, changed);
    }
  }, [html]);

  return (
    <StyledChapterText
      ref={ref}
      className={className}
      onMouseUp={onMouseUp}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    />
  );
}
