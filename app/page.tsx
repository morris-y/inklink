'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import info from '@/info.json';

interface Chapter {
  id: string;
  slug: string;
  title: string;
  order: number;
  last_updated: string | null;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ── layout ─────────────────────────────────────────────── */

const Page = styled.div`
  height: 100vh;
  background-color: #f7f5f0;
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
  display: flex;
  position: relative;
  overflow: hidden;
`;

const Gutter = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 0;
  z-index: 2;
  pointer-events: none;

  /* dark crease line */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
    background: rgba(26, 26, 24, 0.15);
  }

  /* shadow fading left (into left page) */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 40px;
    background: linear-gradient(to left,
      rgba(26, 26, 24, 0.08) 0%,
      rgba(26, 26, 24, 0.03) 40%,
      transparent 100%
    );
  }

  /* shadow fading right (into right page) — use a child span */
  @media (max-width: 860px) {
    display: none;
  }
`;

const GutterRight = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 1px;
  width: 40px;
  background: linear-gradient(to right,
    rgba(26, 26, 24, 0.08) 0%,
    rgba(26, 26, 24, 0.03) 40%,
    transparent 100%
  );
  pointer-events: none;
`;

const LeftPanel = styled.div`
  flex: 0 0 50%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2.5rem 2.5rem 2rem;
  height: 100vh;
  overflow: hidden;

  @media (max-width: 860px) {
    display: none;
  }
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 3rem 5vw 2rem;
  height: 100vh;
  overflow: hidden;

  @media (max-width: 860px) {
    padding: 3rem 6vw 2rem;
  }
`;

const RightCenter = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const RightBottom = styled.div`
  flex-shrink: 0;
  margin-top: auto;
`;

/* ── left panel ─────────────────────────────────────────── */

const LeftHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #1a1a18;
`;

const CoverMedia = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 80px 30px rgba(0, 0, 0, 0.2);
    z-index: 1;
  }
`;

const CoverTileWrap = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const VideoGridWrap = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const TileVideo = styled.video`
  display: block;
  width: 100%;
`;

const CoverCaption = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #888880;
  border-top: 1px solid rgba(26, 26, 24, 0.1);
  padding-top: 0.75rem;
`;

/* ── right panel ────────────────────────────────────────── */

const Subtitle = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #888880;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 400;
  line-height: 1.05;
  color: #1a1a18;
  letter-spacing: -0.02em;
  margin-bottom: 2rem;

  em {
    font-style: italic;
  }
`;

const Blurb = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: clamp(0.78rem, 1vw, 0.88rem);
  line-height: 1.7;
  color: #3a3a36;
  max-width: 44ch;
`;

/* ── chapter list ───────────────────────────────────────── */

const ChapterSection = styled.div`
  margin-top: 0.5rem;
`;

const ChapterSectionTitle = styled.h2`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #888880;
  margin-bottom: 1rem;
`;

const ChapterRow = styled(Link)`
  display: grid;
  grid-template-columns: 3.5rem 1fr auto;
  align-items: baseline;
  padding: 0.7rem 0;
  border-top: 1px solid rgba(26, 26, 24, 0.08);
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(26, 26, 24, 0.03);
  }

  &:last-child {
    border-bottom: 1px solid rgba(26, 26, 24, 0.08);
  }
`;

const ChapterNum = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.75rem;
  color: #888880;
  letter-spacing: 0.02em;
`;

const ChapterTitle = styled.span`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 0.95rem;
  font-style: italic;
  color: #1a1a18;
`;

const ChapterDate = styled.span`
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
  font-size: 0.7rem;
  color: #888880;
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

/* ── CTA & footer ──────────────────────────────────────── */

const CTARow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-top: 2rem;
`;

const PrimaryButton = styled(Link)`
  display: inline-block;
  padding: 0.65rem 1.5rem;
  background: #1a1a18;
  color: #f2ede4;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  border-radius: 4px;
  transition-property: background, scale;
  transition-duration: 0.15s;
  transition-timing-function: ease;

  &:hover { background: #333330; }
  &:active { scale: 0.96; }
`;

const SecondaryButton = styled(Link)`
  display: inline-block;
  padding: 0.65rem 1.5rem;
  background: transparent;
  color: #1a1a18;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  border: 1.5px solid #1a1a18;
  border-radius: 4px;
  transition-property: background, scale;
  transition-duration: 0.15s;
  transition-timing-function: ease;

  &:hover { background: rgba(26, 26, 24, 0.06); }
  &:active { scale: 0.96; }
`;

const Footer = styled.footer`
  margin-top: auto;
  padding-top: 3rem;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  color: rgba(26, 26, 24, 0.32);

  a {
    color: rgba(26, 26, 24, 0.45);
    text-decoration: underline;
    text-underline-offset: 2px;
    &:hover { color: #1a1a18; }
  }
`;

/* ── helpers ────────────────────────────────────────────── */

function padNum(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isVideo(src: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(src);
}

/* ── video tile grid ────────────────────────────────────── */

const STAGGER_SECONDS = 2;

function ImageTiles({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgSize, setBgSize] = useState<string>('auto');

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (img.naturalWidth <= cw && img.naturalHeight <= ch) {
        setBgSize('auto');
      } else if (img.naturalWidth / img.naturalHeight > cw / ch) {
        setBgSize(`${cw}px auto`);
      } else {
        setBgSize(`auto ${ch}px`);
      }
    };
  }, [src]);

  return (
    <CoverTileWrap
      ref={containerRef}
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: bgSize,
        backgroundPosition: 'top left',
      }}
    />
  );
}

function VideoTiles({ src, containerRef }: { src: string; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [layout, setLayout] = useState<{ rows: number; offsetY: number } | null>(null);

  useEffect(() => {
    const probe = document.createElement('video');
    probe.src = src;
    probe.addEventListener('loadedmetadata', () => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const aspect = probe.videoWidth / probe.videoHeight;
      const tileH = cw / aspect;
      const rows = Math.ceil(ch / tileH) + 2;
      const totalH = rows * tileH;
      const offsetY = -(totalH - ch) / 2;
      setLayout({ rows, offsetY });
    });
  }, [src, containerRef]);

  const setRef = useCallback((i: number) => (el: HTMLVideoElement | null) => {
    if (el) {
      el.currentTime = i * STAGGER_SECONDS;
    }
  }, []);

  return (
    <VideoGridWrap style={{ marginTop: layout?.offsetY }}>
      {layout && Array.from({ length: layout.rows }, (_, i) => (
        <TileVideo
          key={i}
          ref={setRef(i)}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={src} type="video/mp4" />
        </TileVideo>
      ))}
    </VideoGridWrap>
  );
}

/* ── component ──────────────────────────────────────────── */

export default function Home() {
  const { title: bookTitle, blurb, coverImage } = info;
  const coverMediaRef = useRef<HTMLDivElement>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    fetch('/api/chapters')
      .then(r => r.json())
      .then(data => setChapters(data.chapters ?? []))
      .catch(() => {});
  }, []);

  const hasCover = coverImage && coverImage.length > 0;

  return (
    <Page>
      <Gutter><GutterRight /></Gutter>
      {/* ── left: media panel ── */}
      <LeftPanel>
        <LeftHeader>
          <span>{bookTitle}</span>
        </LeftHeader>

        <CoverMedia ref={coverMediaRef}>
          {hasCover ? (
            isVideo(coverImage) ? (
              <VideoTiles src={coverImage} containerRef={coverMediaRef} />
            ) : (
              <ImageTiles src={coverImage} />
            )
          ) : (
            <VideoTiles src="/inklink_overview.mp4" containerRef={coverMediaRef} />
          )}
        </CoverMedia>

        <CoverCaption>
          <span>{bookTitle}</span>
        </CoverCaption>
      </LeftPanel>

      {/* ── right: content ── */}
      <RightPanel>
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <RightCenter>
            <motion.div variants={fadeUp}>
              <Subtitle>read &amp; give feedback</Subtitle>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Title>
                <em>{bookTitle}</em>
              </Title>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Blurb>{blurb}</Blurb>
            </motion.div>

            <motion.div variants={fadeUp}>
              <CTARow>
                <PrimaryButton href="/read">Start Reading</PrimaryButton>
                <SecondaryButton href="/admin">Author Dashboard</SecondaryButton>
              </CTARow>
            </motion.div>
          </RightCenter>

          <RightBottom>
            {chapters.length > 0 && (
              <motion.div variants={fadeUp}>
                <ChapterSection>
                  <ChapterSectionTitle>Chapters</ChapterSectionTitle>
                  {chapters.map(ch => (
                    <ChapterRow key={ch.id} href="/read">
                      <ChapterNum>{padNum(ch.order)}</ChapterNum>
                      <ChapterTitle>{ch.title}</ChapterTitle>
                      <ChapterDate>{formatDate(ch.last_updated)}</ChapterDate>
                    </ChapterRow>
                  ))}
                </ChapterSection>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <Footer>
                an <a href="https://github.com/divyavenn/inklink" target="_blank" rel="noopener noreferrer">open source tool</a> built by <a href="https://divyavenn.com/" target="_blank" rel="noopener noreferrer">divya venn</a>.
              </Footer>
            </motion.div>
          </RightBottom>
        </motion.div>
      </RightPanel>
    </Page>
  );
}
