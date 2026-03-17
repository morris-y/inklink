'use client';

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import FeedbackPopover from './FeedbackPopover';


const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;

function selectedTextToLines(selectedText: string, markdown: string): { startLine: number; endLine: number } {
  const lines = markdown.split('\n');
  const idx = markdown.indexOf(selectedText);
  if (idx === -1) {
    const mid = Math.ceil(lines.length / 2);
    return { startLine: mid, endLine: mid };
  }
  let pos = 0;
  let startLine = 1, endLine = 1;
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = pos + lines[i].length;
    if (startLine === 1 && idx <= lineEnd) startLine = i + 1;
    if (idx + selectedText.length <= lineEnd + 1) { endLine = i + 1; break; }
    pos = lineEnd + 1;
  }
  return { startLine, endLine };
}

const PageDesktop = styled.div`
  min-height: 100vh;
  background-color: #dde3ea;
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 400px 400px;
  background-blend-mode: multiply;
  padding: 3rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Paper = styled(motion.div)`
  ${SURFACE_TEXTURE}
  border-radius: 6px;
  box-shadow: 0 2px 16px rgba(26,26,24,0.07);
  padding: 3rem 2.5rem 4rem;
  width: 100%;
  max-width: 860px;
  position: relative;
  z-index: 1;
`;

const ContentRow = styled.div`
  display: flex;
  gap: 3rem;
  align-items: flex-start;
`;

const TextColumn = styled.div`
  flex: 1;
  min-width: 0;
`;

const MarginColumn = styled.div`
  width: 180px;
  flex-shrink: 0;
  position: relative;
  align-self: stretch;
`;

const MarginNote = styled.div`
  position: absolute;
  font-family: 'Koorkin Pro Regular', 'Cormorant Garamond', Georgia, serif;
  font-size: 0.78rem;
  color: #1a1a18;
  line-height: 1.5;
  width: 100%;
  pointer-events: none;
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

const Pill = styled.div<{ $reaction: 'like' | 'dislike'; $hasComment: boolean }>`
  position: fixed;
  transform: translateX(-50%);
  background: ${p =>
    p.$hasComment ? 'rgba(202,138,4,0.95)' :
    p.$reaction === 'like' ? 'rgba(34,197,94,0.95)' :
    'rgba(239,68,68,0.95)'};
  color: white;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.8rem;
  pointer-events: none;
  z-index: 10000;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PillHint = styled.span`
  font-size: 0.68rem;
  opacity: 0.7;
`;

interface ChapterReaderProps {
  chapterId: string;
  sessionId: string;
}

interface ChapterData {
  chapter: { id: string; title: string; };
  versionId: string;
  content: string;
  html: string;
  abTests: any[];
  assignments: Record<string, 'A' | 'B'>;
}

interface PendingFeedback {
  text: string;
  start: number;
  end: number;
  pillX: number;  // viewport coords
  pillY: number;
  reaction: 'like' | 'dislike';
  commentText: string;
}

export interface SavedFeedback {
  localId: string;
  snippetStart: number;
  snippetEnd: number;
  type: 'like' | 'dislike' | 'comment';
  text: string;
  comment?: string;
}

interface EditState {
  localId: string;
  x: number;
  y: number;
}

interface CommentPosition {
  localId: string;
  top: number;
  text: string;
}

export default function ChapterReader({ chapterId, sessionId }: ChapterReaderProps) {
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingFeedback, setPendingFeedback] = useState<PendingFeedback | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<SavedFeedback[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [commentPositions, setCommentPositions] = useState<CommentPosition[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const marginColRef = useRef<HTMLDivElement>(null);
  // Refs so keydown handler (added once) can always read latest state
  const pendingRef = useRef(pendingFeedback);
  const editRef = useRef(editState);
  const chapterDataRef = useRef(chapterData);
  const savedRef = useRef(savedFeedback);
  useEffect(() => { pendingRef.current = pendingFeedback; }, [pendingFeedback]);
  useEffect(() => { editRef.current = editState; }, [editState]);
  useEffect(() => { chapterDataRef.current = chapterData; }, [chapterData]);
  useEffect(() => { savedRef.current = savedFeedback; }, [savedFeedback]);

  // Recompute margin comment positions after each render
  useLayoutEffect(() => {
    if (!contentRef.current || !marginColRef.current) return;
    const marginTop = marginColRef.current.getBoundingClientRect().top;
    const positions: CommentPosition[] = [];
    for (const fb of savedFeedback) {
      if (!fb.comment) continue;
      const mark = contentRef.current.querySelector(`mark[data-local-id="${fb.localId}"]`) as HTMLElement | null;
      if (!mark) continue;
      // getBoundingClientRect difference is scroll-invariant between siblings
      positions.push({ localId: fb.localId, top: mark.getBoundingClientRect().top - marginTop, text: fb.comment });
    }
    setCommentPositions(positions);
  }, [savedFeedback, pendingFeedback]);

  useEffect(() => { fetchChapter(); }, [chapterId]);

  const fetchChapter = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chapters/${chapterId}`);
      setChapterData(await res.json());
    } catch (e) {
      console.error('Error fetching chapter:', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const submitPending = async () => {
    const p = pendingRef.current;
    const cd = chapterDataRef.current;
    if (!p || !cd) return;

    const { startLine, endLine } = selectedTextToLines(p.text, cd.content);
    const base = { sessionId, chapterVersionId: cd.versionId, startLine, endLine };
    const localId = Math.random().toString(36).slice(2);
    const type: SavedFeedback['type'] = p.commentText ? 'comment' : p.reaction;

    setSavedFeedback(prev => [...prev, {
      localId,
      snippetStart: p.start,
      snippetEnd: p.end,
      type,
      text: p.text,
      comment: p.commentText || undefined,
    }]);

    setPendingFeedback(null);
    window.getSelection()?.removeAllRanges();
    showToast(p.commentText ? 'Comment saved' : p.reaction === 'like' ? 'Liked' : 'Noted');

    try {
      const url = p.commentText ? '/api/public/comments' : '/api/public/reactions';
      const body = p.commentText
        ? JSON.stringify({ ...base, body: p.commentText })
        : JSON.stringify({ ...base, reaction: p.reaction });
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Feedback save failed:', res.status, err);
      }
    } catch (err) {
      console.error('Feedback save error:', err);
    }
  };

  // Keydown handler — runs once, reads state via refs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const pending = pendingRef.current;
      const editing = editRef.current;

      // Edit mode (existing highlight)
      if (editing && !pending) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          setSavedFeedback(prev => prev.filter(f => f.localId !== editing.localId));
          setEditState(null);
        } else if (e.key === 'Escape') {
          setEditState(null);
        }
        return;
      }

      if (!pending) return;

      if (e.key === 'Escape') {
        setPendingFeedback(null);
        window.getSelection()?.removeAllRanges();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submitPending();
        return;
      }
      // Toggle reaction (only when no comment yet)
      if (pending.commentText.length === 0 &&
          (e.key === 'Tab' || e.key === ' ' || e.key.startsWith('Arrow'))) {
        e.preventDefault();
        setPendingFeedback(p => p ? { ...p, reaction: p.reaction === 'like' ? 'dislike' : 'like' } : p);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (pending.commentText.length === 0) {
          setPendingFeedback(null);
          window.getSelection()?.removeAllRanges();
        } else {
          setPendingFeedback(p => p ? { ...p, commentText: p.commentText.slice(0, -1) } : p);
        }
        return;
      }
      // Printable char → build comment
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setPendingFeedback(p => p ? { ...p, commentText: p.commentText + e.key } : p);
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // once — uses refs

  const handleMouseUp = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Click on existing highlight → open edit
    const mark = target.closest('mark[data-local-id]') as HTMLElement | null;
    if (mark) {
      const rect = mark.getBoundingClientRect();
      setEditState({
        localId: mark.dataset.localId!,
        x: (rect.left + rect.right) / 2,
        y: rect.top,
      });
      setPendingFeedback(null);
      return;
    }

    // Click outside popover → close edit
    if (!target.closest('[data-feedback-popover]')) {
      setEditState(null);
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Char offset within contentRef
    const getPos = (node: Node, targetNode: Node, offset: number): number => {
      let pos = 0;
      const walk = (cur: Node): boolean => {
        if (cur === targetNode) { pos += offset; return true; }
        if (cur.nodeType === Node.TEXT_NODE) {
          pos += (cur.textContent || '').length;
        } else {
          for (const child of Array.from(cur.childNodes)) {
            if (walk(child)) return true;
          }
        }
        return false;
      };
      walk(node);
      return pos;
    };

    const start = getPos(contentRef.current, range.startContainer, range.startOffset);
    const end = getPos(contentRef.current, range.endContainer, range.endOffset);

    setPendingFeedback({
      text,
      start,
      end,
      pillX: (rect.left + rect.right) / 2,
      pillY: rect.top,
      reaction: 'like',
      commentText: '',
    });
  };

  useEffect(() => {
    const h = (e: Event) => handleMouseUp(e as MouseEvent);
    document.addEventListener('mouseup', h);
    return () => document.removeEventListener('mouseup', h);
  }, []);

  // Derive the pending highlight's CSS type — stable across commentText changes after first char
  const pendingCssType = pendingFeedback
    ? (pendingFeedback.commentText.length > 0 ? 'comment' : pendingFeedback.reaction)
    : null;

  // Only recompute when highlight positions/types change, NOT on every commentText keystroke
  const renderedContent = useMemo(() => {
    if (!chapterData) return null;

    type RenderItem = { start: number; end: number; cssType: string; localId: string };
    const items: RenderItem[] = savedFeedback.map(f => ({
      start: f.snippetStart, end: f.snippetEnd,
      cssType: f.type, localId: f.localId,
    }));
    if (pendingFeedback && pendingCssType) {
      items.push({
        start: pendingFeedback.start, end: pendingFeedback.end,
        cssType: pendingCssType,
        localId: '__pending__',
      });
    }

    if (items.length === 0) {
      return <div dangerouslySetInnerHTML={{ __html: chapterData.html }} />;
    }

    const plainText = contentRef.current?.innerText || chapterData.content;
    const sorted = items.sort((a, b) => a.start - b.start);

    let result = plainText;
    let offset = 0;
    for (const fb of sorted) {
      const s = fb.start + offset;
      const e = fb.end + offset;
      const localIdAttr = fb.localId !== '__pending__' ? ` data-local-id="${fb.localId}"` : '';
      const marked = `<mark class="highlight-${fb.cssType}"${localIdAttr}>${result.substring(s, e)}</mark>`;
      result = result.substring(0, s) + marked + result.substring(e);
      offset += marked.length - (e - s);
    }
    return <div dangerouslySetInnerHTML={{ __html: result.replace(/\n/g, '<br/>') }} />;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterData, savedFeedback, pendingFeedback?.start, pendingFeedback?.end, pendingCssType]);

  const editFeedback = editState
    ? savedFeedback.find(f => f.localId === editState.localId) ?? null
    : null;


  if (loading) {
    return (
      <PageDesktop>
        <Paper initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#9a9892', fontSize: '0.9rem' }}>
            Loading chapter...
          </p>
        </Paper>
      </PageDesktop>
    );
  }

  if (!chapterData) {
    return (
      <PageDesktop>
        <Paper initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', color: '#9a9892', fontSize: '0.9rem' }}>
            Chapter not found
          </p>
        </Paper>
      </PageDesktop>
    );
  }

  return (
    <>
      <style>{`
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
        mark.highlight-like:hover, mark.highlight-dislike:hover, mark.highlight-comment:hover { filter: brightness(0.88); }
      `}</style>

        <Paper
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ContentRow>
            <TextColumn>
              <ChapterTitle>{chapterData.chapter.title}</ChapterTitle>
              <ChapterContent ref={contentRef} className="chapter-content">
                {renderedContent}
              </ChapterContent>
            </TextColumn>
            <MarginColumn ref={marginColRef}>
              {commentPositions.map(cp => (
                <MarginNote key={cp.localId} style={{ top: cp.top }}>
                  {cp.text}
                </MarginNote>
              ))}
            </MarginColumn>
          </ContentRow>
        </Paper>

      {pendingFeedback && (
        <Pill
          $reaction={pendingFeedback.reaction}
          $hasComment={pendingFeedback.commentText.length > 0}
          style={{ left: pendingFeedback.pillX, top: Math.max(8, pendingFeedback.pillY - 44) }}
        >
          {pendingFeedback.commentText
            ? <>💬 <em style={{ fontStyle: 'normal', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{pendingFeedback.commentText}</em></>
            : pendingFeedback.reaction === 'like' ? '👍 Good' : '👎 Bad'
          }
          <PillHint>
            {pendingFeedback.commentText
              ? '↵ save · Esc cancel'
              : 'Tab/Space to toggle · type to comment · ↵ save'}
          </PillHint>
        </Pill>
      )}

      {editFeedback && editState && (
        <FeedbackPopover
          feedback={editFeedback}
          x={editState.x}
          y={editState.y}
          onToggleReaction={() => {
            setSavedFeedback(prev => prev.map(f =>
              f.localId === editFeedback.localId
                ? { ...f, type: f.type === 'like' ? 'dislike' : 'like' }
                : f
            ));
          }}
          onDelete={() => {
            setSavedFeedback(prev => prev.filter(f => f.localId !== editFeedback.localId));
            setEditState(null);
          }}
          onClose={() => setEditState(null)}
        />
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
