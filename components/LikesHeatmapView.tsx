'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import ChapterText from './ChapterText';

/* ─── Types ───────────────────────────────────────────────────────────────── */

export interface HeatmapRange {
  charStart: number;
  charLength: number;
  type: 'like' | 'dislike';
  count: number;
  readerNames: string[];
}

// Kept for reader-reach data
export interface HeatmapLine {
  lineNumber: number;
  lineText: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  readerReachPercent: number;
}

// Backwards compat export (unused by new code)
export interface HeatmapWord {
  wordIndex: number;
  word: string;
  charStart: number | null;
  charLength: number | null;
  likeCount: number;
  dislikeCount: number;
  netScore: number;
  commentCount: number;
}

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
  type: 'like' | 'dislike';
  rangeIndex: number;
}

/* ─── Styled ──────────────────────────────────────────────────────────────── */

const Container = styled.div`
  max-width: 42rem;
  margin: 0 auto;
  position: relative;
`;

const TextLayer = styled.div`
  position: relative;
  z-index: 1;
`;

const OverlayLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
`;

const OVERLAY_ALPHA = 0.18;

const OverlayRectDiv = styled.div<{ $type: string }>`
  position: absolute;
  border-radius: 3px;
  pointer-events: none;
  background-color: ${p =>
    p.$type === 'like'
      ? `rgba(80, 200, 80, ${OVERLAY_ALPHA})`
      : `rgba(200, 80, 80, ${OVERLAY_ALPHA})`};
`;

const Tooltip = styled.div.attrs<{ $x: number; $y: number }>(p => ({
  style: { left: `${p.$x}px`, top: `${p.$y}px` },
}))`
  position: fixed;
  background: rgba(0,0,0,0.92);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.4;
  pointer-events: none;
  z-index: 1000;
  max-width: 280px;
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

interface TextNodeEntry {
  node: Text;
  start: number; // cumulative char offset
  end: number;
}

function buildTextNodeMap(root: HTMLElement): TextNodeEntry[] {
  const entries: TextNodeEntry[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = (node.textContent || '').length;
    entries.push({ node, start: offset, end: offset + len });
    offset += len;
  }
  return entries;
}

function charRangeToDomRange(
  map: TextNodeEntry[],
  charStart: number,
  charLength: number,
): Range | null {
  const charEnd = charStart + charLength;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const entry of map) {
    if (!startNode && entry.end > charStart) {
      startNode = entry.node;
      startOffset = charStart - entry.start;
    }
    if (entry.end >= charEnd) {
      endNode = entry.node;
      endOffset = charEnd - entry.start;
      break;
    }
  }

  if (!startNode || !endNode) return null;

  try {
    const range = document.createRange();
    range.setStart(startNode, Math.max(0, startOffset));
    range.setEnd(endNode, Math.min(endOffset, (endNode.textContent || '').length));
    return range;
  } catch {
    return null;
  }
}

function getCaretCharOffset(map: TextNodeEntry[], x: number, y: number): number | null {
  // Try standard caretRangeFromPoint first, then Firefox's caretPositionFromPoint
  let node: Node | null = null;
  let offset = 0;

  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range) { node = range.startContainer; offset = range.startOffset; }
  } else if ((document as any).caretPositionFromPoint) {
    const pos = (document as any).caretPositionFromPoint(x, y);
    if (pos) { node = pos.offsetNode; offset = pos.offset; }
  }

  if (!node) return null;

  // Find this text node in the map
  for (const entry of map) {
    if (entry.node === node || entry.node.parentNode === node) {
      return entry.start + Math.min(offset, (entry.node.textContent || '').length);
    }
  }
  return null;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

interface LikesHeatmapViewProps {
  chapterHtml: string;
  heatmapLines: HeatmapLine[];
  ranges?: HeatmapRange[];
}

export default function LikesHeatmapView({ chapterHtml, heatmapLines, ranges }: LikesHeatmapViewProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [overlayRects, setOverlayRects] = useState<OverlayRect[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const textNodeMapRef = useRef<TextNodeEntry[]>([]);
  const sortedRangesRef = useRef<HeatmapRange[]>([]);

  // Sort ranges by charStart for efficient binary search during hover
  useEffect(() => {
    sortedRangesRef.current = [...(ranges || [])].sort((a, b) => a.charStart - b.charStart);
  }, [ranges]);

  // Compute overlay rects from ranges
  const computeOverlays = useCallback(() => {
    const el = textRef.current;
    if (!el || !ranges || ranges.length === 0) {
      setOverlayRects([]);
      return;
    }

    const map = buildTextNodeMap(el);
    textNodeMapRef.current = map;
    const containerRect = el.getBoundingClientRect();
    const rects: OverlayRect[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const domRange = charRangeToDomRange(map, r.charStart, r.charLength);
      if (!domRange) continue;

      const clientRects = domRange.getClientRects();
      for (const cr of clientRects) {
        if (cr.width === 0 || cr.height === 0) continue;
        rects.push({
          top: cr.top - containerRect.top + el.scrollTop,
          left: cr.left - containerRect.left + el.scrollLeft,
          width: cr.width,
          height: cr.height,
          type: r.type,
          rangeIndex: i,
        });
      }
    }

    setOverlayRects(rects);
  }, [ranges]);

  // Recompute on mount, html change, or ranges change
  useEffect(() => {
    // Small delay to ensure the HTML is painted and fonts are loaded
    const frame = requestAnimationFrame(() => {
      document.fonts.ready.then(computeOverlays);
    });
    return () => cancelAnimationFrame(frame);
  }, [chapterHtml, computeOverlays]);

  // Recalculate on resize
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => computeOverlays());
    observer.observe(el);
    return () => observer.disconnect();
  }, [computeOverlays]);

  // Hover: find ranges under cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const map = textNodeMapRef.current;
    if (map.length === 0 || !ranges || ranges.length === 0) return;

    const charOffset = getCaretCharOffset(map, e.clientX, e.clientY);
    if (charOffset === null) { setTooltip(null); return; }

    // Find all ranges containing this char offset
    const sorted = sortedRangesRef.current;
    const hits: HeatmapRange[] = [];
    for (const r of sorted) {
      if (r.charStart > charOffset) break; // sorted, no more matches possible
      if (charOffset < r.charStart + r.charLength) {
        hits.push(r);
      }
    }

    if (hits.length === 0) { setTooltip(null); return; }

    // Build tooltip lines grouped by type
    const lines: string[] = [];
    const likes = hits.filter(h => h.type === 'like');
    const dislikes = hits.filter(h => h.type === 'dislike');

    for (const { label, items } of [
      { label: 'Liked by', items: likes },
      { label: 'Disliked by', items: dislikes },
    ]) {
      if (items.length === 0) continue;
      const totalCount = items.reduce((s, i) => s + i.count, 0);
      const names = [...new Set(items.flatMap(i => i.readerNames))];
      if (names.length > 0) {
        lines.push(`${label}: ${names.join(', ')} (${totalCount})`);
      } else {
        lines.push(`${totalCount} ${items[0].type}${totalCount !== 1 ? 's' : ''}`);
      }
    }

    setTooltip({ x: e.clientX + 12, y: e.clientY + 12, lines });
  }, [ranges]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <Container onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <OverlayLayer>
        {overlayRects.map((rect, i) => (
          <OverlayRectDiv
            key={i}
            $type={rect.type}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))}
      </OverlayLayer>
      <TextLayer ref={textRef}>
        <ChapterText html={chapterHtml} />
      </TextLayer>
      {tooltip && (
        <Tooltip $x={tooltip.x} $y={tooltip.y}>
          {tooltip.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </Tooltip>
      )}
    </Container>
  );
}
