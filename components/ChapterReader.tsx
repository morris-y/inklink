'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';

const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;

const Paper = styled(motion.div)`
  padding: 4rem 2.5rem 6rem;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  position: relative;

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 2rem 0 4rem;
  }
`;

const ContentRow = styled.div`
  display: flex;
  gap: 3rem;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0;
  }
`;

const TextColumn = styled.div`
  flex: 1;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 0 2.5rem;
  }
`;

const MarginColumn = styled.div`
  width: 200px;
  flex-shrink: 0;
  position: relative;
  align-self: stretch;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ChapterTitle = styled.h2`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 2.25rem;
  font-weight: 400;
  color: #1a1a18;
  margin-bottom: 2.5rem;
  line-height: 1.2;
`;

const ChapterContent = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.8;
  color: #2a2a26;
  position: relative;

  p { margin-bottom: 1.5rem; }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-playfair), Georgia, serif;
    font-weight: 400;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: #1a1a18;
  }

  blockquote {
    border-left: 2px solid rgba(26, 26, 24, 0.2);
    padding-left: 1.5rem;
    margin: 1.5rem 0;
    color: #6a6a60;
    font-style: italic;
  }

  mark.highlight-like {
    background: linear-gradient(to right, rgba(34,197,94,0.1), rgba(34,197,94,0.45) 4%, rgba(34,197,94,0.2));
    border-radius: 0.8em 0.3em; padding: 0.1em 0.4em; margin: 0 -0.4em;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; cursor: pointer;
  }
  mark.highlight-dislike {
    background: linear-gradient(to right, rgba(239,68,68,0.1), rgba(239,68,68,0.45) 4%, rgba(239,68,68,0.2));
    border-radius: 0.8em 0.3em; padding: 0.1em 0.4em; margin: 0 -0.4em;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; cursor: pointer;
  }
  mark.highlight-comment {
    background: linear-gradient(to right, rgba(253,224,71,0.2), rgba(253,224,71,0.6) 4%, rgba(253,224,71,0.3));
    border-radius: 0.8em 0.3em; padding: 0.1em 0.4em; margin: 0 -0.4em;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; cursor: pointer;
  }
  mark.highlight-suggestion {
    background: linear-gradient(to right, rgba(185,40,40,0.06), rgba(185,40,40,0.14) 4%, rgba(185,40,40,0.06));
    color: rgba(185,40,40,0.9);
    border-radius: 0.8em 0.3em; padding: 0.1em 0.4em; margin: 0 -0.4em;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; cursor: pointer;
  }
  mark.suggestion-editing {
    background: rgba(185,40,40,0.08);
    color: rgba(185,40,40,0.9);
    border-radius: 0.8em 0.3em; padding: 0.1em 0.4em; margin: 0 -0.4em;
    -webkit-box-decoration-break: clone; box-decoration-break: clone;
    outline: none; cursor: text; caret-color: rgba(185,40,40,0.9);
    border-bottom: 1.5px solid rgba(185,40,40,0.5);
  }
  mark.highlight-focused {
    outline: none;
  }
  mark:hover { filter: brightness(0.88); }
`;

const SelectionToolbar = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${p => p.$x}px;
  top: ${p => p.$y}px;
  transform: translate(-50%, -100%);
  display: flex;
  gap: 2px;
  background: #1a1a18;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  z-index: 100;
`;

const ToolbarBtn = styled.button<{ $active?: boolean }>`
  background: ${p => p.$active ? 'rgba(255,255,255,0.15)' : 'transparent'};
  border: none;
  color: #e8e4dc;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: rgba(255,255,255,0.12); }
`;

const EditHint = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  color: rgba(185,40,40,0.6);
  margin-top: 0.5rem;
  letter-spacing: 0.02em;
`;

const MarginNoteEl = styled.div<{ $isPending?: boolean }>`
  position: absolute;
  width: 100%;
  font-family: var(--font-caveat), cursive;
  font-size: 1.4rem;
  color: ${p => p.$isPending ? 'rgba(26,26,24,0.5)' : '#333'};
  line-height: 1.4;
  pointer-events: ${p => p.$isPending ? 'none' : 'auto'};
  cursor: ${p => p.$isPending ? 'default' : 'text'};
  padding-left: 0.5rem;
`;

const MarginNoteTextarea = styled.textarea`
  font-family: var(--font-caveat), cursive;
  font-size: 1.4rem;
  color: #333;
  line-height: 1.4;
  width: 100%;
  border: none;
  background: transparent;
  resize: none;
  outline: none;
  padding: 0;
  padding-left: 0.5rem;
`;

const SuccessToast = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #1a1a18;
  color: #f2ede4;
  padding: 0.75rem 1.25rem;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(26, 26, 24, 0.2);
  z-index: 10000;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.875rem;
`;

const ChapterNav = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 2.5rem 4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    padding: 1.5rem 2.5rem 3rem;
  }
`;

const NavButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
  color: rgba(26,26,24,0.4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.15s ease;
  &:hover { color: #1a1a18; }
`;

interface ChapterReaderProps {
  chapterId: string;
  sessionId: string | null;
  prefetchedData?: Record<string, unknown>;
  prevChapterId: string | null;
  nextChapterId: string | null;
  onNavigate: (id: string) => void;
}

interface ChapterData {
  chapter: { id: string; title: string; };
  versionId: string;
  content: string;
  html: string;
  abTests: any[];
  assignments: Record<string, 'A' | 'B'>;
}

type PendingMode = 'like' | 'dislike' | 'comment';

interface PendingState {
  selectedText: string;
  charStart: number;
  charLength: number;
  mode: PendingMode;
  commentText: string;
  anchorY: number; // px from top of margin column
}

interface FeedbackItem {
  id: string;
  type: 'like' | 'dislike' | 'comment' | 'suggestion';
  charStart: number;
  charLength: number;
  comment?: string;      // for comment type: the note text
  anchorY?: number;      // for comment type: margin note position
  suggestedText?: string; // for suggestion type: what the user typed
}

interface EditingNote {
  itemId: string;
  text: string;
}

// Walk DOM text nodes to compute char offset from container root
function getCharOffset(container: Node, targetNode: Node, targetOffset: number): number {
  let pos = 0;
  const walk = (cur: Node): boolean => {
    if (cur === targetNode) {
      pos += targetOffset;
      return true;
    }
    if (cur.nodeType === Node.TEXT_NODE) {
      pos += (cur.textContent || '').length;
    } else {
      for (const child of Array.from(cur.childNodes)) {
        if (walk(child)) return true;
      }
    }
    return false;
  };
  walk(container);
  return pos;
}

// Apply highlight marks to HTML using char ranges
function buildHighlightedHtml(
  html: string,
  items: FeedbackItem[],
  pending: PendingState | null,
  focusedId: string | null,
  suggestionEdit?: { charStart: number; charLength: number },
): string {
  if (typeof window === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;

  const toRender = [
    ...items.map(item => ({
      charStart: item.charStart,
      charLength: item.charLength,
      cssClass: `highlight-${item.type}`,
      id: item.id,
      suggestedText: item.type === 'suggestion' ? item.suggestedText : undefined,
    })),
    ...(pending ? [{ charStart: pending.charStart, charLength: pending.charLength, cssClass: `highlight-${pending.mode}`, id: '__pending__', suggestedText: undefined }] : []),
  ].sort((a, b) => a.charStart - b.charStart);

  for (const item of toRender) {
    charWrap(div, item.charStart, item.charLength, () => {
      const mark = document.createElement('mark');
      mark.className = item.cssClass + (item.id === focusedId ? ' highlight-focused' : '');
      if (item.id !== '__pending__') mark.dataset.feedbackId = item.id;
      return mark;
    }, item.suggestedText);
  }

  // Inject an inline contentEditable mark for active suggestion editing
  if (suggestionEdit) {
    charWrap(div, suggestionEdit.charStart, suggestionEdit.charLength, () => {
      const mark = document.createElement('mark');
      mark.className = 'highlight-suggestion suggestion-editing';
      mark.contentEditable = 'true';
      mark.style.outline = 'none';
      mark.style.cursor = 'text';
      return mark;
    });
  }

  return div.innerHTML;
}

// Wrap text nodes overlapping [charIdx, charIdx+length) with a new element.
// If replacementText is provided, the first overlapping span shows replacementText
// instead of the original content; subsequent overlapping spans are removed.
function charWrap(
  div: HTMLElement,
  charIdx: number,
  length: number,
  makeEl: () => HTMLElement,
  replacementText?: string,
): void {
  const selEnd = charIdx + length;
  let charPos = 0;
  let replacementUsed = false;

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const nodeEnd = charPos + text.length;
      const overlapStart = Math.max(charPos, charIdx);
      const overlapEnd = Math.min(nodeEnd, selEnd);

      if (overlapStart < overlapEnd && text.slice(overlapStart - charPos, overlapEnd - charPos).trim() !== '') {
        const localStart = overlapStart - charPos;
        const localEnd = overlapEnd - charPos;
        const before = document.createTextNode(text.slice(0, localStart));
        const after = document.createTextNode(text.slice(localEnd));

        if (replacementText !== undefined) {
          if (!replacementUsed) {
            const el = makeEl();
            el.textContent = replacementText;
            node.parentNode?.insertBefore(before, node);
            node.parentNode?.insertBefore(el, node);
            node.parentNode?.insertBefore(after, node);
            replacementUsed = true;
          } else {
            // Subsequent nodes in range: remove the overlapping content
            node.parentNode?.insertBefore(before, node);
            node.parentNode?.insertBefore(after, node);
          }
          node.parentNode?.removeChild(node);
        } else {
          const el = makeEl();
          el.textContent = text.slice(localStart, localEnd);
          node.parentNode?.insertBefore(before, node);
          node.parentNode?.insertBefore(el, node);
          node.parentNode?.insertBefore(after, node);
          node.parentNode?.removeChild(node);
        }
      }

      charPos += text.length;
    } else {
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  };

  walk(div);
}

// Find the minimal contiguous diff between two strings
function findMinimalDiff(original: string, current: string): {
  originalSpan: string; currentSpan: string; diffStart: number;
} | null {
  if (original === current) return null;

  let start = 0;
  while (start < original.length && start < current.length && original[start] === current[start]) {
    start++;
  }

  let endOrig = original.length;
  let endCurr = current.length;
  while (endOrig > start && endCurr > start && original[endOrig - 1] === current[endCurr - 1]) {
    endOrig--;
    endCurr--;
  }

  return {
    originalSpan: original.slice(start, endOrig),
    currentSpan: current.slice(start, endCurr),
    diffStart: start,
  };
}

// Margin note collision avoidance
const MARGIN_LINE_PX = 32;   // approx px per line at 1.4rem Caveat, line-height 1.4
const MARGIN_CHARS_PER_LINE = 18; // approx chars fitting in margin column
const MARGIN_NOTE_GAP = 8;   // min gap between adjacent notes

function resolveMarginPositions(
  items: Array<{ id: string; anchorY: number; comment?: string }>
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY);
  const result = new Map<string, number>();
  let bottomY = 0;
  for (const item of sorted) {
    const y = Math.max(Math.max(0, item.anchorY), bottomY);
    result.set(item.id, y);
    const lines = Math.max(1, Math.ceil((item.comment?.length ?? 3) / MARGIN_CHARS_PER_LINE));
    bottomY = y + lines * MARGIN_LINE_PX + MARGIN_NOTE_GAP;
  }
  return result;
}

export default function ChapterReader({ chapterId, sessionId, prefetchedData, prevChapterId, nextChapterId, onNavigate }: ChapterReaderProps) {
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingState | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [focusedFeedbackId, setFocusedFeedbackId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [suggEditMeta, setSuggEditMeta] = useState<{ originalText: string; charStart: number; charLength: number } | null>(null);
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const marginColRef = useRef<HTMLDivElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // Refs so keydown handler (added once) can always read latest state
  const pendingRef = useRef(pending);
  const editModeRef = useRef(editMode);
  const focusedIdRef = useRef(focusedFeedbackId);
  const chapterDataRef = useRef(chapterData);
  const feedbackItemsRef = useRef(feedbackItems);
  useEffect(() => { pendingRef.current = pending; if (!pending) setToolbarPos(null); }, [pending]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { focusedIdRef.current = focusedFeedbackId; }, [focusedFeedbackId]);
  useEffect(() => { chapterDataRef.current = chapterData; }, [chapterData]);
  useEffect(() => { feedbackItemsRef.current = feedbackItems; }, [feedbackItems]);

  // Update innerHTML whenever feedbackItems, pending, or focusedId change (not in edit mode)
  useEffect(() => {
    if (!contentRef.current || !chapterData) return;
    if (editMode) return;
    contentRef.current.innerHTML = buildHighlightedHtml(chapterData.html, feedbackItems, pending, focusedFeedbackId);
  }, [chapterData, feedbackItems, pending, focusedFeedbackId, editMode]);

  useEffect(() => { fetchChapter(); }, [chapterId]);

  // When sessionId arrives after the chapter is already loaded, fetch feedback
  useEffect(() => {
    if (sessionId && chapterData?.versionId) {
      loadSessionFeedback(chapterData.versionId);
    }
  }, [sessionId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const fetchChapter = async () => {
    try {
      setLoading(true);
      setPending(null);
      setFeedbackItems([]);
      setFocusedFeedbackId(null);
      setEditMode(false);
      setSuggEditMeta(null);

      // Use prefetched data if available (first chapter already loaded with chapter list)
      const data = prefetchedData ?? await fetch(`/api/chapters/${chapterId}`).then(r => r.json());
      setChapterData(data);

      // Load existing session feedback after chapter loads
      if (data.versionId) {
        loadSessionFeedback(data.versionId);
      }
    } catch (e) {
      console.error('Error fetching chapter:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionFeedback = async (versionId: string) => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/public/session-feedback?sessionId=${sessionId}&chapterVersionId=${versionId}`);
      if (!res.ok) return;
      const data = await res.json();

      const items: FeedbackItem[] = [
        ...data.reactions.map((r: any) => ({
          id: r.id,
          type: r.reaction as 'like' | 'dislike',
          charStart: r.char_start,
          charLength: r.char_length,
        })),
        ...data.comments.map((c: any) => ({
          id: c.id,
          type: 'comment' as const,
          charStart: c.char_start,
          charLength: c.char_length,
          comment: c.body,
        })),
        ...data.suggestions.map((s: any) => ({
          id: s.id,
          type: 'suggestion' as const,
          charStart: s.char_start,
          charLength: s.char_length,
          suggestedText: s.suggested_text,
        })),
      ];
      setFeedbackItems(items);
    } catch (e) {
      console.error('Error loading session feedback:', e);
    }
  };

  const submitPending = useCallback(async () => {
    const p = pendingRef.current;
    const cd = chapterDataRef.current;
    if (!p || !cd) return;

    const localId = Math.random().toString(36).slice(2);
    const type: FeedbackItem['type'] = p.mode === 'comment' ? 'comment' : p.mode;

    // Optimistically add to local state
    const newItem: FeedbackItem = {
      id: localId,
      type,
      charStart: p.charStart,
      charLength: p.charLength,
      comment: p.mode === 'comment' ? p.commentText : undefined,
      anchorY: p.anchorY,
    };
    setFeedbackItems(prev => [...prev, newItem]);
    setPending(null);
    window.getSelection()?.removeAllRanges();
    showToast(p.mode === 'comment' ? 'Comment saved' : p.mode === 'like' ? 'Liked' : 'Noted');

    try {
      let url: string;
      let body: string;

      if (p.mode === 'comment') {
        url = '/api/public/comments';
        body = JSON.stringify({ sessionId, chapterVersionId: cd.versionId, body: p.commentText, selectedText: p.selectedText });
      } else {
        url = '/api/public/reactions';
        body = JSON.stringify({ sessionId, chapterVersionId: cd.versionId, reaction: p.mode, selectedText: p.selectedText });
      }

      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (res.ok) {
        const data = await res.json();
        // Replace local ID with server ID
        setFeedbackItems(prev => prev.map(item => item.id === localId ? { ...item, id: data.id } : item));
      } else {
        console.error('Feedback save failed:', res.status);
      }
    } catch (err) {
      console.error('Feedback save error:', err);
    }
  }, [sessionId]);

  const deleteFeedback = useCallback(async (id: string) => {
    const item = feedbackItemsRef.current.find(f => f.id === id);
    if (!item) return;

    setFeedbackItems(prev => prev.filter(f => f.id !== id));
    setFocusedFeedbackId(null);

    try {
      let url: string;
      if (item.type === 'comment') {
        url = `/api/public/comments/${id}?sessionId=${sessionId}`;
      } else if (item.type === 'suggestion') {
        url = `/api/public/suggestions/${id}?sessionId=${sessionId}`;
      } else {
        url = `/api/public/reactions/${id}?sessionId=${sessionId}`;
      }
      await fetch(url, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete feedback error:', err);
    }
  }, [sessionId]);

  const enterSuggestionMode = useCallback((charStart: number, charLength: number, originalText: string) => {
    if (!contentRef.current || !chapterDataRef.current) return;
    setSuggEditMeta({ originalText, charStart, charLength });
    // Build HTML with inline contentEditable mark at the selection
    contentRef.current.innerHTML = buildHighlightedHtml(
      chapterDataRef.current.html,
      feedbackItemsRef.current,
      null,
      null,
      { charStart, charLength },
    );
    const mark = contentRef.current.querySelector('mark.suggestion-editing') as HTMLElement | null;
    if (mark) {
      mark.focus();
      // Select all so user can type to replace
      const range = document.createRange();
      range.selectNodeContents(mark);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    setEditMode(true);
    setPending(null);
    setFocusedFeedbackId(null);
  }, []);

  const exitEditMode = useCallback((submit: boolean) => {
    if (!contentRef.current) return;
    const mark = contentRef.current.querySelector('mark.suggestion-editing') as HTMLElement | null;
    const suggestedText = mark?.textContent ?? '';
    const meta = suggEditMetaRef.current;

    if (submit && meta && suggestedText && suggestedText !== meta.originalText) {
      submitSuggestion(meta.originalText, suggestedText, meta.charStart);
    }

    setEditMode(false);
    setSuggEditMeta(null);
  }, []);

  const submitSuggestion = useCallback(async (originalText: string, suggestedText: string, _charStart: number) => {
    const cd = chapterDataRef.current;
    if (!cd || !originalText || !suggestedText || originalText === suggestedText) return;

    const localId = Math.random().toString(36).slice(2);

    // We don't know charStart/charLength on client accurately for suggestions,
    // so add a placeholder item; server will compute positions
    const tmpItem: FeedbackItem = {
      id: localId,
      type: 'suggestion',
      charStart: 0,
      charLength: 0,
    };
    setFeedbackItems(prev => [...prev, tmpItem]);
    showToast('Edit proposed');

    try {
      const res = await fetch('/api/public/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, chapterVersionId: cd.versionId, originalText, suggestedText }),
      });
      if (res.ok) {
        const data = await res.json();
        // Remove placeholder; reload session feedback to get accurate positions
        setFeedbackItems(prev => prev.filter(f => f.id !== localId));
        loadSessionFeedback(cd.versionId);
      } else {
        setFeedbackItems(prev => prev.filter(f => f.id !== localId));
        console.error('Suggestion save failed:', res.status);
      }
    } catch (err) {
      setFeedbackItems(prev => prev.filter(f => f.id !== localId));
      console.error('Suggestion save error:', err);
    }
  }, [sessionId]);

  const suggEditMetaRef = useRef(suggEditMeta);
  useEffect(() => { suggEditMetaRef.current = suggEditMeta; }, [suggEditMeta]);

  // Stable refs for keydown handler
  const submitPendingRef = useRef(submitPending);
  const deleteFeedbackRef = useRef(deleteFeedback);
  const enterSuggestionModeRef = useRef(enterSuggestionMode);
  const exitEditModeRef = useRef(exitEditMode);
  useEffect(() => { submitPendingRef.current = submitPending; }, [submitPending]);
  useEffect(() => { deleteFeedbackRef.current = deleteFeedback; }, [deleteFeedback]);
  useEffect(() => { enterSuggestionModeRef.current = enterSuggestionMode; }, [enterSuggestionMode]);
  useEffect(() => { exitEditModeRef.current = exitEditMode; }, [exitEditMode]);

  // Keydown handler — runs once, reads state via refs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = pendingRef.current;
      const em = editModeRef.current;
      const fid = focusedIdRef.current;

      // In edit mode: only intercept Enter (submit) and Escape (cancel)
      if (em) {
        if (e.key === 'Enter') {
          e.preventDefault();
          exitEditModeRef.current(true);
        } else if (e.key === 'Escape') {
          exitEditModeRef.current(false);
        }
        return;
      }

      // Focused highlight: backspace = delete, escape = unfocus
      if (fid && !p) {
        if (e.key === 'Backspace') {
          e.preventDefault();
          deleteFeedbackRef.current(fid);
        } else if (e.key === 'Escape') {
          setFocusedFeedbackId(null);
        }
        return;
      }

      if (!p) return;

      if (e.key === 'Escape') {
        setPending(null);
        window.getSelection()?.removeAllRanges();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submitPendingRef.current();
        return;
      }
      // Arrow key → toggle like/dislike (only when no comment yet)
      if (p.commentText.length === 0 && e.key.startsWith('Arrow')) {
        e.preventDefault();
        setPending(prev => prev ? { ...prev, mode: prev.mode === 'like' ? 'dislike' : 'like' } : prev);
        return;
      }
      // Tab → enter inline suggestion editing mode
      if (e.key === 'Tab' && p.commentText.length === 0) {
        e.preventDefault();
        enterSuggestionModeRef.current(p.charStart, p.charLength, p.selectedText);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (p.commentText.length === 0) {
          setPending(null);
          window.getSelection()?.removeAllRanges();
        } else {
          setPending(prev => prev ? { ...prev, commentText: prev.commentText.slice(0, -1) } : prev);
        }
        return;
      }
      // Printable char → comment mode
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setPending(prev => prev ? { ...prev, mode: 'comment', commentText: prev.commentText + e.key } : prev);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // once — uses refs

  // Mouse up handler
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as Node;
      const targetEl = target.nodeType === Node.ELEMENT_NODE ? target as HTMLElement : target.parentElement;

      // Ignore clicks inside margin column
      if (targetEl?.closest('[data-margin-col]')) return;

      const selection = window.getSelection();

      // Has a text selection → create pending
      if (selection && !selection.isCollapsed && selection.toString().trim() && contentRef.current) {
        // Make sure selection is within contentRef
        const range = selection.getRangeAt(0);
        if (!contentRef.current.contains(range.commonAncestorContainer)) return;

        const text = selection.toString().trim();
        const rect = range.getBoundingClientRect();

        const charStart = getCharOffset(contentRef.current, range.startContainer, range.startOffset);
        const charEnd = getCharOffset(contentRef.current, range.endContainer, range.endOffset);
        const charLength = Math.max(0, charEnd - charStart);

        const marginTop = marginColRef.current?.getBoundingClientRect().top ?? 0;
        const anchorY = rect.top - marginTop;

        setPending({
          selectedText: text,
          charStart,
          charLength,
          mode: 'like',
          commentText: '',
          anchorY,
        });
        setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
        setFocusedFeedbackId(null);
        return;
      }

      // Click with no selection
      if (!selection?.isCollapsed) return;

      // Don't enter edit mode if we're in a feedback interaction
      if (pendingRef.current) return;

      // Click on existing mark → focus it
      const mark = targetEl?.closest('mark[data-feedback-id]') as HTMLElement | null;
      if (mark && mark.dataset.feedbackId) {
        setFocusedFeedbackId(mark.dataset.feedbackId);
        return;
      }

      setFocusedFeedbackId(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Auto-advance to next chapter
  useEffect(() => {
    if (!nextChapterId || !scrollSentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onNavigate(nextChapterId); },
      { threshold: 1.0 }
    );
    observer.observe(scrollSentinelRef.current);
    return () => observer.disconnect();
  }, [nextChapterId, onNavigate]);

  // Compute margin note positions with collision avoidance
  const commentItems = feedbackItems.filter(f => f.type === 'comment' && f.anchorY !== undefined);
  const resolvedMarginPositions = resolveMarginPositions(commentItems as Array<{ id: string; anchorY: number; comment?: string }>);
  const pendingNoteItem = pending?.mode === 'comment' ? pending : null;

  // Update comment anchor positions based on rendered marks
  useLayoutEffect(() => {
    if (!contentRef.current || !marginColRef.current) return;
    const marginTop = marginColRef.current.getBoundingClientRect().top;
    setFeedbackItems(prev => prev.map(item => {
      if (item.type !== 'comment') return item;
      const mark = contentRef.current!.querySelector(`mark[data-feedback-id="${item.id}"]`) as HTMLElement | null;
      if (!mark) return item;
      return { ...item, anchorY: mark.getBoundingClientRect().top - marginTop };
    }));
  }, [feedbackItems.map(f => f.id).join(','), editMode]);

  const updateNoteText = async (itemId: string, newText: string) => {
    setFeedbackItems(prev => prev.map(f => f.id === itemId ? { ...f, comment: newText } : f));
    setEditingNote(null);
    try {
      await fetch(`/api/public/comments/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, body: newText }),
      });
    } catch (err) {
      console.error('Update note error:', err);
    }
  };

  if (loading) {
    return (
      <Paper initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#9a9892', fontSize: '0.9rem' }}>
          Loading chapter...
        </p>
      </Paper>
    );
  }

  if (!chapterData) {
    return (
      <Paper initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#9a9892', fontSize: '0.9rem' }}>
          Chapter not found
        </p>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <ContentRow>
          <TextColumn>
            <ChapterTitle>{chapterData.chapter.title}</ChapterTitle>
            <ChapterContent
              ref={contentRef}
              data-chapter-content="true"
              // innerHTML is managed by useEffect, not dangerouslySetInnerHTML
            />
            {editMode && (
              <EditHint>type your edit · ↵ propose · esc cancel</EditHint>
            )}
          </TextColumn>
          <MarginColumn ref={marginColRef} data-margin-col="true">
            {/* Pending margin note (streaming as user types) */}
            {pendingNoteItem && (
              <MarginNoteEl
                $isPending
                style={{ top: Math.max(0, pendingNoteItem.anchorY) }}
              >
                {pendingNoteItem.commentText || '…'}
              </MarginNoteEl>
            )}
            {/* Persisted comment notes */}
            {commentItems.map(item => (
              <MarginNoteEl
                key={item.id}
                $isPending={false}
                style={{ top: resolvedMarginPositions.get(item.id) ?? Math.max(0, item.anchorY ?? 0) }}
                onClick={() => {
                  if (editingNote?.itemId !== item.id) {
                    setEditingNote({ itemId: item.id, text: item.comment ?? '' });
                  }
                }}
              >
                {editingNote?.itemId === item.id ? (
                  <MarginNoteTextarea
                    autoFocus
                    value={editingNote.text}
                    onChange={e => setEditingNote({ ...editingNote, text: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        updateNoteText(item.id, editingNote.text);
                      } else if (e.key === 'Escape') {
                        setEditingNote(null);
                      }
                    }}
                    onBlur={() => {
                      if (editingNote) updateNoteText(item.id, editingNote.text);
                    }}
                    rows={3}
                  />
                ) : (
                  item.comment
                )}
              </MarginNoteEl>
            ))}
          </MarginColumn>
        </ContentRow>
      </Paper>

      <ChapterNav>
        {prevChapterId
          ? <NavButton onClick={() => onNavigate(prevChapterId)}>← Previous chapter</NavButton>
          : <span />}
        {nextChapterId
          ? <NavButton onClick={() => onNavigate(nextChapterId)}>Next chapter →</NavButton>
          : <span />}
      </ChapterNav>

      <div ref={scrollSentinelRef} style={{ height: 1 }} />

      {/* Selection toolbar: like / dislike / edit */}
      {pending && toolbarPos && !editMode && pending.commentText.length === 0 && (
        <SelectionToolbar $x={toolbarPos.x} $y={toolbarPos.y}>
          <ToolbarBtn
            $active={pending.mode === 'like'}
            onClick={() => { setPending(p => p ? { ...p, mode: 'like' } : p); }}
          >
            👍
          </ToolbarBtn>
          <ToolbarBtn
            $active={pending.mode === 'dislike'}
            onClick={() => { setPending(p => p ? { ...p, mode: 'dislike' } : p); }}
          >
            👎
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => enterSuggestionModeRef.current(pending.charStart, pending.charLength, pending.selectedText)}
          >
            ✎
          </ToolbarBtn>
        </SelectionToolbar>
      )}

      <AnimatePresence>
        {showSuccessToast && (
          <SuccessToast
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toastMessage}
          </SuccessToast>
        )}
      </AnimatePresence>
    </>
  );
}
