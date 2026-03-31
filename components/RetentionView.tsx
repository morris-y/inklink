'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import AnimateNumber from './AnimateNumber';

/* ── Types ── */

export interface RetentionData {
  totalReaders: number;
  completions: number;
  completionRate: number;
  avgActiveSeconds: number;
  continuedToNext: number;
  continuationRate: number;
  dropOffCurve: { lineNumber: number; readersReached: number; reachPercent: number }[];
}

export interface InterestSignup {
  id: string;
  email: string;
  reader_name: string | null;
  created_at: string;
}

/* ── Styled Components ── */

const Wrap = styled.div`
  padding: 2rem 2.5rem;
  font-family: var(--font-inter), system-ui, sans-serif;
`;

const Stats = styled.div`
  display: flex;
  gap: 2.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  > span {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(26,26,24,0.4);
  }
  strong {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a1a18;
    font-variant-numeric: tabular-nums;
    display: flex;
    align-items: baseline;
  }
`;

const SectionLabel = styled.div`
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(26,26,24,0.4);
  margin-bottom: 0.5rem;
`;

const ChartWrap = styled.div`
  position: relative;
  height: 240px;
  margin-top: 1rem;
  margin-bottom: 2rem;
  cursor: crosshair;
`;

const SnapDot = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(26,26,24,0.45);
  border: none;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(26,26,24,0.2);
`;

const YLabel = styled.div`
  position: absolute;
  left: -4px;
  transform: translate(-100%, -50%);
  font-size: 0.58rem;
  color: rgba(26,26,24,0.3);
  font-variant-numeric: tabular-nums;
`;

const XLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: rgba(26,26,24,0.3);
  position: absolute;
  bottom: -18px;
  left: 0;
  right: 0;
`;

const Tooltip = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.95rem;
  line-height: 1.8;
  color: #2a2a26;
  margin-top: 0.75rem;
  min-height: 3.2rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  background: rgba(26,26,24,0.03);

  em { font-style: italic; }
  strong { font-weight: 600; }
`;

const TooltipPercent = styled.span`
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(26,26,24,0.4);
  margin-bottom: 0.25rem;
  display: block;
`;

const TooltipHint = styled.span`
  color: rgba(26,26,24,0.3);
  font-size: 0.78rem;
`;

const SignupsSection = styled.div`
  border-top: 1px solid rgba(26,26,24,0.08);
  padding-top: 1.5rem;
`;

const SignupsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  font-size: 0.85rem;
  color: #2a2a26;
  border-bottom: 1px solid rgba(26,26,24,0.04);

  span:last-child {
    font-size: 0.75rem;
    color: rgba(26,26,24,0.35);
  }
`;

/* ── Helpers ── */

function extractLinesFromHtml(html: string): string[] {
  if (typeof window === 'undefined' || !html) return [];
  const div = document.createElement('div');
  div.innerHTML = html;
  const lines: string[] = [];
  div.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, hr').forEach(el => {
    lines.push(el.innerHTML);
  });
  return lines;
}

const H_GRID = [0, 25, 50, 75, 100];

/** Build an SVG path with rounded corners on both top and bottom of each step */
function roundedPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;

  const R = 20; // corner radius in viewBox units

  // The staircase pattern is: H leg → V leg → H leg → V leg …
  // Each step has two corners: top (H→V) and bottom (V→H).
  // We round both with quadratic beziers.
  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (prev.y !== curr.y) {
      const dy = curr.y - prev.y;
      const sign = Math.sign(dy);
      const absDy = Math.abs(dy);
      const r = Math.min(R, absDy / 2, (curr.x - prev.x) / 2);

      // Top corner: end of horizontal leg, curving into vertical
      d += ` L${curr.x - r},${prev.y}`;
      d += ` Q${curr.x},${prev.y} ${curr.x},${prev.y + sign * r}`;

      // Bottom corner: end of vertical leg, curving into next horizontal
      const nextH = i < points.length - 1 ? points[i + 1] : null;
      if (nextH && nextH.y === curr.y) {
        d += ` L${curr.x},${curr.y - sign * r}`;
        d += ` Q${curr.x},${curr.y} ${curr.x + r},${curr.y}`;
      } else {
        d += ` L${curr.x},${curr.y}`;
      }
    } else {
      d += ` L${curr.x},${curr.y}`;
    }
  }
  return d;
}

/* ── Component ── */

export default function RetentionView({ data, signups, chapterHtml }: {
  data: RetentionData | null;
  signups: InterestSignup[];
  chapterHtml: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lines = useRef<string[]>([]);

  useEffect(() => {
    lines.current = extractLinesFromHtml(chapterHtml);
  }, [chapterHtml]);

  const handleChartMouse = useCallback((e: React.MouseEvent) => {
    if (!data || !chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const idx = Math.max(0, Math.min(data.dropOffCurve.length - 1, Math.round(pct * (data.dropOffCurve.length - 1))));
    setHoveredIdx(idx);
  }, [data]);

  if (!data) return <Wrap style={{ color: 'rgba(26,26,24,0.4)', fontSize: '0.9rem' }}>No retention data yet.</Wrap>;

  const curve = data.dropOffCurve;
  const avgMin = Math.round(data.avgActiveSeconds / 60);

  const hoveredPoint = hoveredIdx !== null ? curve[hoveredIdx] : null;
  const hoveredLineHtml = hoveredPoint ? lines.current[hoveredPoint.lineNumber - 1] : null;
  const dotXPct = hoveredIdx !== null && curve.length > 1 ? (hoveredIdx / (curve.length - 1)) * 100 : 0;
  // SVG viewBox is "0 -PAD w 100+PAD", so CSS top % must map into that range
  const SVG_PAD = 10; // extra units above 100%
  const SVG_TOTAL = 100 + SVG_PAD;
  const dotYPct = hoveredPoint ? ((SVG_PAD + (100 - hoveredPoint.reachPercent)) / SVG_TOTAL) * 100 : 0;

  const vGridCount = Math.min(10, curve.length);
  const vGridStep = curve.length > 1 ? (curve.length - 1) / vGridCount : 1;

  return (
    <Wrap>
      <Stats>
        <StatBox><span>Readers</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{data.totalReaders}</AnimateNumber></strong></StatBox>
        <StatBox><span>Completions</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{data.completions}</AnimateNumber></strong></StatBox>
        <StatBox><span>Completion rate</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{data.completionRate}</AnimateNumber>%</strong></StatBox>
        <StatBox><span>Avg. reading time</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{avgMin}</AnimateNumber>m</strong></StatBox>
        <StatBox><span>Next chapter</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{data.continuationRate}</AnimateNumber>%</strong></StatBox>
        <StatBox><span>Email signups</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{signups.length}</AnimateNumber></strong></StatBox>
      </Stats>

      {curve.length > 0 && (
        <>
          <SectionLabel>Reader drop-off</SectionLabel>
          <ChartWrap ref={chartRef} onMouseMove={handleChartMouse} onMouseLeave={() => setHoveredIdx(null)}>
            <svg viewBox={`0 ${-SVG_PAD} ${curve.length - 1} ${SVG_TOTAL}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
              {/* Horizontal grid lines */}
              {H_GRID.map(pct => (
                <line key={`h-${pct}`} x1="0" y1={100 - pct} x2={curve.length - 1} y2={100 - pct}
                  stroke="rgba(26,26,24,0.12)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              ))}
              {/* Vertical grid lines */}
              {Array.from({ length: vGridCount + 1 }, (_, i) => Math.round(i * vGridStep)).map((idx, i) => (
                <line key={`v-${i}`} x1={idx} y1={-SVG_PAD} x2={idx} y2="100"
                  stroke="rgba(26,26,24,0.12)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              ))}
              {/* Filled area — flat pale gray */}
              <path
                d={`${roundedPath(curve.map((p, i) => ({ x: i, y: 100 - p.reachPercent })))} L${curve.length - 1},100 L0,100 Z`}
                fill="rgba(26,26,24,0.06)"
              />
              {/* Main line — gray, smooth curve */}
              <path
                d={roundedPath(curve.map((p, i) => ({ x: i, y: 100 - p.reachPercent })))}
                fill="none" stroke="rgba(26,26,24,0.45)" strokeWidth="1.5"
                strokeLinecap="round" vectorEffect="non-scaling-stroke"
              />
              {/* Hover guide */}
              {hoveredIdx !== null && (
                <line x1={hoveredIdx} y1={-SVG_PAD} x2={hoveredIdx} y2="100"
                  stroke="rgba(26,26,24,0.2)" strokeWidth="0.8" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
              )}
            </svg>
            {hoveredPoint && <SnapDot style={{ left: `${dotXPct}%`, top: `${dotYPct}%` }} />}
            {H_GRID.filter(p => p > 0).map(pct => (
              <YLabel key={`label-${pct}`} style={{ top: `${((SVG_PAD + (100 - pct)) / SVG_TOTAL) * 100}%` }}>{pct}%</YLabel>
            ))}
            <XLabels>
              <span>Line 1</span>
              <span>Line {curve.length}</span>
            </XLabels>
          </ChartWrap>

          <Tooltip>
            {hoveredPoint ? (
              <>
                <TooltipPercent>{hoveredPoint.reachPercent}% of readers kept reading past line {hoveredPoint.lineNumber}</TooltipPercent>
                {hoveredLineHtml ? (
                  <span dangerouslySetInnerHTML={{ __html: hoveredLineHtml }} />
                ) : (
                  <TooltipHint>Line {hoveredPoint.lineNumber}</TooltipHint>
                )}
              </>
            ) : (
              <TooltipHint>Hover over the graph to see line details</TooltipHint>
            )}
          </Tooltip>
        </>
      )}

      {signups.length > 0 && (
        <SignupsSection>
          <SectionLabel style={{ marginBottom: '1rem' }}>Email signups ({signups.length})</SectionLabel>
          {signups.map(s => (
            <SignupsRow key={s.id}>
              <span>{s.email}{s.reader_name ? ` (${s.reader_name})` : ''}</span>
              <span>{new Date(s.created_at).toLocaleDateString()}</span>
            </SignupsRow>
          ))}
        </SignupsSection>
      )}
    </Wrap>
  );
}
