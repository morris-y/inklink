'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { selectedVersionAtom } from '@/lib/atoms';

const CHARCOAL = '#1a1a18';
const RAIL_Y = 20;
const MIN_EDGE_GAP = 5;
const DEFAULT_DOT_SIZE = 7;
const SELECTED_DOT_SIZE = 12;
const HOVER_SCALE = 1.7;
const FALLBACK_TRACK_WIDTH = 640;

const Container = styled.section`
  display: block;
  width: 100%;
`;

const Track = styled.div`
  position: relative;
  width: 100%;
  min-width: 0;
  height: 34px;
`;

const Rail = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: ${RAIL_Y}px;
  height: 1px;
  background: ${CHARCOAL};
`;

const Dot = styled(motion.button)<{ $size: number }>`
  position: absolute;
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  appearance: none;
  -webkit-appearance: none;
  background: ${CHARCOAL};
  cursor: pointer;
  transform-origin: center;
  z-index: 1;
`;

const Meta = styled(motion.div)`
  padding-top: 0.1rem;
`;

const MetaMessage = styled(motion.div)`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 0.9rem;
  font-style: italic;
  color: ${CHARCOAL};
  line-height: 1.35;
`;

const MetaLine = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.16rem;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  color: rgba(26,26,24,0.52);
  font-variant-numeric: tabular-nums;
`;

interface Version {
  commitSha: string;
  commitShortSha: string;
  date: Date | string;
  author: string;
  message: string;
  feedbackCount: number;
}

interface VersionTimelineProps {
  chapterId: string;
  currentCommitSha: string;
  onVersionChange: (commitSha: string) => void;
}

interface DotCluster {
  ideals: number[];
  radii: number[];
  gaps: number[];
  startIndex: number;
  start: number;
}

const getOffsets = (gaps: number[]) => {
  const offsets = [0];

  for (const gap of gaps) {
    offsets.push(offsets[offsets.length - 1] + gap);
  }

  return offsets;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getClusterStart = (ideals: number[], radii: number[], gaps: number[], trackWidth: number) => {
  const offsets = getOffsets(gaps);
  const preferredStart = ideals.reduce((sum, ideal, index) => sum + ideal - offsets[index], 0) / ideals.length;
  const minStart = Math.max(...radii.map((radius, index) => radius - offsets[index]));
  const maxStart = Math.min(...radii.map((radius, index) => trackWidth - radius - offsets[index]));

  if (maxStart < minStart) {
    return (minStart + maxStart) / 2;
  }

  return clamp(preferredStart, minStart, maxStart);
};

const resolveDotPositions = (ideals: number[], radii: number[], trackWidth: number) => {
  if (ideals.length <= 1) return ideals;

  const gaps = radii.slice(0, -1).map((radius, index) => radius + radii[index + 1] + MIN_EDGE_GAP);
  const clusters: DotCluster[] = [];

  ideals.forEach((ideal, index) => {
    clusters.push({
      ideals: [ideal],
      radii: [radii[index]],
      gaps: [],
      startIndex: index,
      start: getClusterStart([ideal], [radii[index]], [], trackWidth),
    });

    while (clusters.length > 1) {
      const right = clusters[clusters.length - 1];
      const left = clusters[clusters.length - 2];
      const leftOffsets = getOffsets(left.gaps);
      const leftLastPosition = left.start + leftOffsets[leftOffsets.length - 1];
      const boundaryGap = gaps[right.startIndex - 1];
      const minimumRightStart = leftLastPosition + boundaryGap;

      if (right.start >= minimumRightStart) break;

      const mergedIdeals = [...left.ideals, ...right.ideals];
      const mergedRadii = [...left.radii, ...right.radii];
      const mergedGaps = [...left.gaps, boundaryGap, ...right.gaps];

      clusters.splice(clusters.length - 2, 2, {
        ideals: mergedIdeals,
        radii: mergedRadii,
        gaps: mergedGaps,
        startIndex: left.startIndex,
        start: getClusterStart(mergedIdeals, mergedRadii, mergedGaps, trackWidth),
      });
    }
  });

  return clusters.flatMap(cluster => {
    const offsets = getOffsets(cluster.gaps);
    return offsets.map(offset => cluster.start + offset);
  });
};

export default function VersionTimeline({ chapterId, currentCommitSha, onVersionChange }: VersionTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSha, setSelectedSha] = useAtom(selectedVersionAtom);
  const [hoveredSha, setHoveredSha] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (currentCommitSha && selectedSha === null) {
      setSelectedSha(currentCommitSha);
    }
  }, [currentCommitSha, selectedSha, setSelectedSha]);

  useEffect(() => {
    setHoveredSha(null);
    fetchVersions();
  }, [chapterId]);

  useLayoutEffect(() => {
    if (!trackRef.current) return;

    const element = trackRef.current;
    const updateWidth = () => {
      const nextWidth = element.getBoundingClientRect().width || element.clientWidth || element.offsetWidth;
      setTrackWidth(nextWidth);
    };

    updateWidth();
    const frameId = window.requestAnimationFrame(updateWidth);

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener('resize', updateWidth);
      };
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/${chapterId}/versions?t=${Date.now()}`);
      const data = await response.json();
      const sorted = (data.versions || []).slice().sort(
        (a: Version, b: Version) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setVersions(sorted);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading || versions.length === 0) return null;

  const fallbackVersion = versions[versions.length - 1];
  const selectedVersion = versions.find(version => version.commitSha === selectedSha) ?? fallbackVersion;
  const previewVersion = versions.find(version => version.commitSha === hoveredSha) ?? selectedVersion;

  const timestamps = versions.map(version => new Date(version.date).getTime());
  const minTimestamp = timestamps[0];
  const maxTimestamp = timestamps[timestamps.length - 1];
  const range = maxTimestamp - minTimestamp || 1;
  const dotSizes = versions.map(version => (
    version.commitSha === selectedVersion.commitSha ? SELECTED_DOT_SIZE : DEFAULT_DOT_SIZE
  ));
  const radii = dotSizes.map(size => size / 2);
  const effectiveTrackWidth =
    trackWidth ||
    trackRef.current?.getBoundingClientRect().width ||
    trackRef.current?.clientWidth ||
    FALLBACK_TRACK_WIDTH;
  const minTrackX = radii[0] ?? 0;
  const maxTrackX = Math.max(effectiveTrackWidth - (radii[radii.length - 1] ?? 0), minTrackX);
  const usableWidth = Math.max(maxTrackX - minTrackX, 0);
  const positions = resolveDotPositions(
    timestamps.map(timestamp => minTrackX + ((timestamp - minTimestamp) / range) * usableWidth),
    radii,
    effectiveTrackWidth
  );

  return (
    <Container>
      <Track ref={trackRef}>
        <Rail />

        {versions.map((version, index) => {
          const isSelected = version.commitSha === selectedVersion.commitSha;
          const isHoveredPreview = version.commitSha === hoveredSha && !isSelected;

          return (
            <Dot
              key={version.commitSha}
              $size={dotSizes[index]}
              animate={{ scale: isHoveredPreview ? HOVER_SCALE : 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              style={{
                left: `${positions[index] - dotSizes[index] / 2}px`,
                top: `${RAIL_Y - dotSizes[index] / 2}px`,
              }}
              onMouseEnter={() => {
                if (!isSelected) setHoveredSha(version.commitSha);
              }}
              onMouseLeave={() => {
                setHoveredSha(current => current === version.commitSha ? null : current);
              }}
              onFocus={() => {
                if (!isSelected) setHoveredSha(version.commitSha);
              }}
              onBlur={() => {
                setHoveredSha(current => current === version.commitSha ? null : current);
              }}
              onClick={() => {
                setHoveredSha(null);
                setSelectedSha(version.commitSha);
                onVersionChange(version.commitSha);
              }}
              title={`${version.message} · ${formatDate(version.date)}`}
              aria-label={`Select version ${index + 1}, ${version.commitShortSha}`}
            />
          );
        })}
      </Track>

      <AnimatePresence mode="wait" initial={false}>
        <Meta
          key={previewVersion.commitSha}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          <MetaLine
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, delay: 0.03 }}
          >
            <span>{selectedVersion.commitShortSha}</span>
            <span>{selectedVersion.author}</span>
            <span>{formatDate(selectedVersion.date)}</span>
            <span>"{selectedVersion.message}"</span>
          </MetaLine>
        </Meta>
      </AnimatePresence>
    </Container>
  );
}
