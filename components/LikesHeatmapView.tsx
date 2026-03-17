'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import ChapterText from './ChapterText';

const Container = styled.div`
  max-width: 42rem;
  margin: 0 auto;
`;

const HeatmapChapterText = styled(ChapterText)`
  .heatmap-block {
    border-radius: 3px;
    transition: filter 0.15s ease;
    cursor: default;
  }
  .heatmap-block:hover {
    filter: brightness(0.88);
  }
`;

const Tooltip = styled.div.attrs<{ $x: number; $y: number }>(p => ({
  style: { left: `${p.$x}px`, top: `${p.$y}px` },
}))`
  position: fixed;
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
`;

export interface HeatmapLine {
  lineNumber: number;
  lineText: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  readerReachPercent: number;
}

interface LikesHeatmapViewProps {
  chapterHtml: string;
  heatmapLines: HeatmapLine[];
}

function lineColor(likes: number, dislikes: number): string | null {
  const total = likes + dislikes;
  if (total === 0) return null;
  const intensity = (likes - dislikes) / total;
  const a = Math.min(0.28, 0.07 + total * 0.035);
  if (Math.abs(intensity) < 0.1) return `rgba(140,140,140,${(a * 0.7).toFixed(2)})`;
  if (intensity > 0) return `rgba(34,197,94,${a.toFixed(2)})`;
  return `rgba(239,68,68,${a.toFixed(2)})`;
}

function applyHeatmap(html: string, lines: HeatmapLine[]): string {
  if (typeof window === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  const blocks = Array.from(div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote'));
  const contentLines = lines.filter(l => l.lineText.trim() !== '');
  blocks.forEach((block, i) => {
    const line = contentLines[i];
    if (!line) return;
    const el = block as HTMLElement;
    el.classList.add('heatmap-block');
    const color = lineColor(line.likeCount, line.dislikeCount);
    if (color) el.style.backgroundColor = color;
    el.dataset.likes = String(line.likeCount);
    el.dataset.dislikes = String(line.dislikeCount);
    el.dataset.comments = String(line.commentCount);
  });
  return div.innerHTML;
}

export default function LikesHeatmapView({ chapterHtml, heatmapLines }: LikesHeatmapViewProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const processedHtml = useMemo(
    () => applyHeatmap(chapterHtml, heatmapLines),
    [chapterHtml, heatmapLines],
  );

  const handleMouseOver = (e: React.MouseEvent) => {
    const block = (e.target as HTMLElement).closest('.heatmap-block') as HTMLElement | null;
    if (!block) return;
    const likes = parseInt(block.dataset.likes || '0');
    const dislikes = parseInt(block.dataset.dislikes || '0');
    const comments = parseInt(block.dataset.comments || '0');
    if (likes + dislikes + comments === 0) return;
    const parts: string[] = [];
    if (likes > 0) parts.push(`${likes} like${likes !== 1 ? 's' : ''}`);
    if (dislikes > 0) parts.push(`${dislikes} dislike${dislikes !== 1 ? 's' : ''}`);
    if (comments > 0) parts.push(`${comments} comment${comments !== 1 ? 's' : ''}`);
    setTooltip({ x: e.clientX + 10, y: e.clientY + 10, content: parts.join(', ') });
  };

  const handleMouseOut = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.heatmap-block')) setTooltip(null);
  };

  return (
    <Container>
      <HeatmapChapterText html={processedHtml} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} />
      {tooltip && <Tooltip $x={tooltip.x} $y={tooltip.y}>{tooltip.content}</Tooltip>}
    </Container>
  );
}
