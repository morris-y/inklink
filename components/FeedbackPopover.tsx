'use client';

import { useEffect } from 'react';
import styled from 'styled-components';
import { SavedFeedback } from './ChapterReader';

const Popover = styled.div`
  position: fixed;
  transform: translate(-50%, calc(-100% - 8px));
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  padding: 0.5rem;
  z-index: 10000;
  user-select: none;
  min-width: 180px;
`;

const Row = styled.div`
  display: flex;
  gap: 0.375rem;
  align-items: center;
`;

const Btn = styled.button<{ $variant?: 'delete' | 'active' }>`
  padding: 0.4rem 0.7rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  background: ${p =>
    p.$variant === 'delete' ? '#fff0f0' :
    p.$variant === 'active' ? '#f0f0f0' :
    '#f5f5f5'};
  color: ${p => p.$variant === 'delete' ? '#c62828' : '#1a1a1a'};
  transition: filter 0.12s;
  &:hover { filter: brightness(0.93); }
`;

const CommentPreview = styled.div`
  font-size: 0.78rem;
  color: #555;
  padding: 0.35rem 0.5rem 0.1rem;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Hint = styled.div`
  font-size: 0.68rem;
  color: #aaa;
  padding: 0.3rem 0.5rem 0.1rem;
`;

export interface FeedbackPopoverProps {
  feedback: SavedFeedback;
  x: number;
  y: number;
  onToggleReaction: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function FeedbackPopover({ feedback, x, y, onToggleReaction, onDelete, onClose }: FeedbackPopoverProps) {
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-feedback-popover]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const reactionIcon = feedback.type === 'dislike' ? '👎' : '👍';
  const toggleIcon = feedback.type === 'dislike' ? '👍' : '👎';

  return (
    <div
      data-feedback-popover
      style={{ position: 'fixed', left: x, top: y, zIndex: 10000 }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <Popover>
        <Row>
          <Btn $variant="active">{reactionIcon}</Btn>
          <Btn onClick={onToggleReaction}>Switch to {toggleIcon}</Btn>
          <Btn $variant="delete" onClick={onDelete}>Delete</Btn>
        </Row>
        {feedback.comment && (
          <CommentPreview>💬 {feedback.comment}</CommentPreview>
        )}
        <Hint>Del/Backspace to delete · Esc to close</Hint>
      </Popover>
    </div>
  );
}
