'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import ChapterText from './ChapterText';

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  height: calc(100vh - 400px);
  min-height: 600px;
`;

const TextPanel = styled.div`
  overflow-y: auto;
  padding: 0 2rem;
`;

const AnnotatedChapterText = styled(ChapterText)`
  user-select: text;
  max-width: 42rem;

  .suggestion-highlight {
    margin: 0 -0.4em;
    padding: 0.1em 0.4em;
    border-radius: 0.8em 0.3em;
    background-image: linear-gradient(to right, rgba(245,158,11,0.1), rgba(245,158,11,0.7) 4%, rgba(245,158,11,0.3));
    cursor: pointer;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    transition: filter 0.15s ease;
  }

  .suggestion-highlight[data-hovered="true"] {
    filter: brightness(0.9);
  }
`;

const CommentsPanel = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(26,26,24,0.07);
  background: rgba(26,26,24,0.015);
`;

const CommentsPanelHeader = styled.div`
  padding: 1.25rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(26,26,24,0.06);
`;

const CommentsTitle = styled.h3`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(26,26,24,0.35);
  margin: 0;
`;

const CommentsCount = styled.span`
  color: rgba(26,26,24,0.35);
  font-size: 0.65rem;
  font-weight: 400;
  margin-left: 0.4rem;
`;

const CommentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const CommentCard = styled(motion.div)<{ $isHovered: boolean; $isEdit?: boolean }>`
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(26,26,24,0.055);
  cursor: pointer;
  transition: background 0.15s ease;
  background: ${p => p.$isHovered ? 'rgba(26,26,24,0.035)' : 'transparent'};
  border-left: 2px solid ${p => p.$isHovered
    ? (p.$isEdit ? 'rgba(185,120,40,0.6)' : 'rgba(80,100,200,0.45)')
    : 'transparent'};
  &:hover { background: rgba(26,26,24,0.025); }
`;

const SnippetText = styled.div`
  font-family: var(--font-playfair), Georgia, serif;
  font-style: italic;
  font-size: 0.82rem;
  color: rgba(26,26,24,0.55);
  margin-bottom: 0.5rem;
  line-height: 1.5;
`;

const CommentBody = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  color: #1a1a18;
  line-height: 1.55;
  margin-bottom: 0.5rem;
`;

const EditSuggestion = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
  color: rgba(26,26,24,0.7);
  margin-bottom: 0.5rem;
  line-height: 1.5;
  border-left: 2px solid rgba(185,120,40,0.5);
  padding-left: 0.75rem;
`;

const CommentMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  color: rgba(26,26,24,0.32);
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const ReaderBadge = styled.span`
  font-size: 0.68rem;
  color: rgba(26,26,24,0.45);
  font-weight: 500;
  letter-spacing: 0.02em;
`;

const LineBadge = styled.span`
  font-size: 0.65rem;
  color: rgba(26,26,24,0.28);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1.5rem;
  color: rgba(26,26,24,0.3);
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
`;

export interface DashComment {
  id: string;
  start_line: number;
  end_line: number;
  body: string;
  created_at: string;
  reader_name: string | null;
  reader_slug: string | null;
}

export interface DashSuggestion {
  id: string;
  start_line: number;
  end_line: number;
  original_text: string;
  suggested_text: string;
  rationale: string | null;
  created_at: string;
  reader_name: string | null;
}

type Item =
  | { kind: 'comment'; data: DashComment }
  | { kind: 'suggestion'; data: DashSuggestion };

interface CommentsViewProps {
  chapterHtml: string;
  comments: DashComment[];
  suggestions: DashSuggestion[];
}

function applySuggestionHighlights(html: string, suggestions: DashSuggestion[], hoveredId: string | null): string {
  if (typeof window === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  const fullText = div.textContent || '';

  for (const s of suggestions) {
    if (!s.original_text) continue;
    const idx = fullText.indexOf(s.original_text);
    if (idx === -1) continue;

    let charPos = 0;
    const walk = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const start = idx - charPos;
        const end = start + s.original_text.length;
        if (start >= 0 && end <= text.length) {
          const span = document.createElement('span');
          span.className = 'suggestion-highlight';
          span.dataset.id = s.id;
          span.dataset.hovered = String(hoveredId === s.id);
          span.textContent = text.slice(start, end);
          const before = document.createTextNode(text.slice(0, start));
          const after = document.createTextNode(text.slice(end));
          node.parentNode?.insertBefore(before, node);
          node.parentNode?.insertBefore(span, node);
          node.parentNode?.insertBefore(after, node);
          node.parentNode?.removeChild(node);
          charPos += text.length;
          return true;
        }
        charPos += text.length;
      } else {
        for (const child of Array.from(node.childNodes)) {
          if (walk(child)) return true;
        }
      }
      return false;
    };
    walk(div);
  }
  return div.innerHTML;
}

export default function CommentsView({ chapterHtml, comments, suggestions }: CommentsViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const items: Item[] = useMemo(() => {
    const all: Item[] = [
      ...comments.map(c => ({ kind: 'comment' as const, data: c })),
      ...suggestions.map(s => ({ kind: 'suggestion' as const, data: s })),
    ];
    return all.sort((a, b) => a.data.start_line - b.data.start_line);
  }, [comments, suggestions]);

  const processedHtml = useMemo(
    () => applySuggestionHighlights(chapterHtml, suggestions, hoveredId),
    [chapterHtml, suggestions, hoveredId],
  );

  return (
    <Container>
      <TextPanel>
        <AnnotatedChapterText html={processedHtml} />
      </TextPanel>

      <CommentsPanel>
        <CommentsPanelHeader>
          <CommentsTitle>
            Comments & Edits
            <CommentsCount>{items.length}</CommentsCount>
          </CommentsTitle>
        </CommentsPanelHeader>

        <CommentsList>
          {items.length === 0 ? (
            <EmptyState>No comments or edits yet</EmptyState>
          ) : (
            items.map((item, index) => {
              const isEdit = item.kind === 'suggestion';
              const id = item.data.id;
              const isHovered = hoveredId === id;
              const readerName = item.data.reader_name;
              const line = `L${item.data.start_line}${item.data.end_line !== item.data.start_line ? `–${item.data.end_line}` : ''}`;

              return (
                <CommentCard
                  key={id}
                  $isHovered={isHovered}
                  $isEdit={isEdit}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  {isEdit ? (
                    <>
                      <SnippetText>"{(item.data as DashSuggestion).original_text}"</SnippetText>
                      <EditSuggestion>→ "{(item.data as DashSuggestion).suggested_text}"</EditSuggestion>
                      {(item.data as DashSuggestion).rationale && (
                        <CommentBody>{(item.data as DashSuggestion).rationale}</CommentBody>
                      )}
                    </>
                  ) : (
                    <CommentBody>{(item.data as DashComment).body}</CommentBody>
                  )}
                  <CommentMeta>
                    <ReaderBadge>{readerName || 'Anonymous'}</ReaderBadge>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <LineBadge>{line}</LineBadge>
                      <span>{new Date(item.data.created_at).toLocaleDateString()}</span>
                    </div>
                  </CommentMeta>
                </CommentCard>
              );
            })
          )}
        </CommentsList>
      </CommentsPanel>
    </Container>
  );
}
