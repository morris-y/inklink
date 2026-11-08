'use client';

import Link from 'next/link';
import styled from 'styled-components';
import { motion } from 'framer-motion';
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
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.7 } },
};

/* ── layout ─────────────────────────────────────────── */

const Page = styled.div`
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #f7f5f0;
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const Broadsheet = styled.div`
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 0 3rem;
  flex: 1;
  display: flex;
  flex-direction: column;

  @media (max-width: 640px) {
    padding: 0 max(1.25rem, env(safe-area-inset-right)) 0 max(1.25rem, env(safe-area-inset-left));
  }
`;

/* ── meta bar ──────────────────────────────────────── */

const MetaBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 0 0.85rem;
  border-top: 2px solid #1a1a18;
  border-bottom: 1px solid rgba(26, 26, 24, 0.14);
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.78rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #4a4a46;

  /* Phone: date + dashboard link on one row, edition line under it. */
  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'date link'
      'vol  vol';
    row-gap: 0.15rem;
    column-gap: 0.75rem;
    padding: 0.35rem 0 0.6rem;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
  }
`;

const MetaDate = styled.span`
  @media (max-width: 640px) { grid-area: date; }
`;

const MetaVolume = styled.span`
  @media (max-width: 640px) {
    grid-area: vol;
    color: #6b6965;
  }
`;

const MetaLink = styled(Link)`
  color: #4a4a46;
  text-decoration: none;
  letter-spacing: 0.13em;
  transition: color 0.12s;
  &:hover { color: #1a1a18; }
  &:focus-visible { outline: 2px solid #1a1a18; outline-offset: 2px; }

  @media (max-width: 640px) {
    grid-area: link;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 0 0 0.75rem;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
`;

/* ── masthead ───────────────────────────────────────── */

const MastheadWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2.25rem 0 2rem;
  border-bottom: 2px solid #1a1a18;
  gap: 0.75rem;
`;

const MastheadTitle = styled.h1`
  font-family: var(--font-shippori-mincho), serif;
  font-size: clamp(2.4rem, 7.5vw, 5rem);
  overflow-wrap: anywhere;
  font-weight: 700;
  line-height: 1;
  color: #1a1a18;
  letter-spacing: 0.05em;
  text-align: center;
  margin: 0;
`;

const MastheadRule = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(26, 26, 24, 0.18);
  }
`;

const MastheadSubtitle = styled.p`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.05rem;
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: #8a8680;
  margin: 0;
`;

const MastheadOrnament = styled.span`
  font-family: var(--font-shippori-mincho), 'Noto Serif SC', serif;
  font-size: 1.4rem;
  color: #6b6965;
  letter-spacing: 0.2em;
  white-space: nowrap;
`;

/* ── body columns ───────────────────────────────────── */

const ColumnsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  flex: 1;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const LeftCol = styled.div`
  padding: 2rem 3rem 2.5rem 0;
  border-right: 1px solid rgba(26, 26, 24, 0.11);

  @media (max-width: 640px) {
    padding: 2rem 0 1.5rem;
    border-right: none;
    border-bottom: 1px solid rgba(26, 26, 24, 0.11);
  }
`;

const RightCol = styled.div`
  padding: 2rem 0 2.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;

  @media (max-width: 640px) {
    padding: 2rem 0 2.5rem;
  }
`;

/* ── section label ─────────────────────────────────── */

const SectionLabel = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #888880;
  margin-bottom: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(26, 26, 24, 0.11);
`;

/* ── chapter list ──────────────────────────────────── */

const ChapterRow = styled(Link)`
  display: grid;
  grid-template-columns: 2.25rem 1fr auto;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid rgba(26, 26, 24, 0.07);
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.55; }
  &:focus-visible { outline: 2px solid #1a1a18; outline-offset: 2px; }
  &:active { opacity: 0.55; }

  /* Phone: date moves under the title so long titles keep their width. */
  @media (max-width: 640px) {
    grid-template-columns: 2rem minmax(0, 1fr);
    row-gap: 0.2rem;
    padding: 0.85rem 0;
  }
`;

const ChapterNum = styled.span`
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.85rem;
  color: #6b6965;
  letter-spacing: 0.04em;
`;

const ChapterTitle = styled.span`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.27rem;
  font-style: italic;
  color: #1a1a18;
  line-height: 1.3;
`;

const ChapterDate = styled.span`
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.78rem;
  color: #6b6965;
  white-space: nowrap;
  letter-spacing: 0.03em;

  @media (max-width: 640px) {
    grid-column: 2;
    font-size: 0.72rem;
  }
`;

/* ── CTA ───────────────────────────────────────────── */

const CTAStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const PrimaryButton = styled(Link)`
  display: block;
  padding: 0.8rem 1rem;
  background: #1a1a18;
  color: #f2ede4;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  border: 1.5px solid #1a1a18;
  transition: background 0.15s;

  &:hover { background: #2e2e2a; }
  &:focus-visible { outline: 2px solid #1a1a18; outline-offset: 2px; }
`;

const SecondaryButton = styled(Link)`
  display: block;
  padding: 0.8rem 1rem;
  background: transparent;
  color: #1a1a18;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid rgba(26, 26, 24, 0.22);
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(26, 26, 24, 0.04);
    border-color: rgba(26, 26, 24, 0.4);
  }
  &:focus-visible { outline: 2px solid #1a1a18; outline-offset: 2px; }
`;

/* ── footer ────────────────────────────────────────── */

const Footer = styled.footer`
  padding: 1.25rem 0 2rem;
  border-top: 1px solid rgba(26, 26, 24, 0.1);
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(26, 26, 24, 0.32);

  a {
    color: rgba(26, 26, 24, 0.42);
    text-decoration: underline;
    text-underline-offset: 2px;
    &:hover { color: #1a1a18; }
  }
`;

/* ── helpers ─────────────────────────────────────────  */

function padNum(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function currentEdition(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Tells the reader that the previous history entry is this page, so its back
// button can step back here instead of pushing a new "/" entry. Only for plain
// clicks: a modifier click opens a new tab, which has no home entry behind it.
function markFromHome(e: React.MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  try { sessionStorage.setItem('inklink:from-home', '1'); } catch { /* storage blocked */ }
}

/* ── component ───────────────────────────────────────  */

export default function HomePageClient({ chapters }: { chapters: Chapter[] }) {
  const { title: bookTitle, subtitle: bookSubtitle } = info as typeof info & { subtitle?: string };

  return (
    <Page>
      <Broadsheet>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          {/* Meta bar */}
          <motion.div variants={fadeIn}>
            <MetaBar>
              <MetaDate>{currentEdition()}</MetaDate>
              <MetaVolume>Vol. I · Private Edition</MetaVolume>
              <MetaLink href="/admin">Dashboard →</MetaLink>
            </MetaBar>
          </motion.div>

          {/* Masthead */}
          <motion.div variants={fadeUp}>
            <MastheadWrap>
              {bookSubtitle && <MastheadSubtitle>{bookSubtitle}</MastheadSubtitle>}
              <MastheadTitle>{bookTitle}</MastheadTitle>
              <MastheadRule>
                <MastheadOrnament>草稿審閱</MastheadOrnament>
              </MastheadRule>
            </MastheadWrap>
          </motion.div>

          {/* Body */}
          <ColumnsRow>
            {/* Left: chapters */}
            <LeftCol>
              <motion.div variants={fadeIn}>
                <SectionLabel>Chapters</SectionLabel>
              </motion.div>
              {chapters.length === 0 ? (
                <motion.div variants={fadeIn}>
                  <ChapterNum style={{ display: 'block', paddingTop: '0.5rem' }}>—</ChapterNum>
                </motion.div>
              ) : (
                chapters.map(ch => (
                  <motion.div key={ch.id} variants={fadeUp}>
                    <ChapterRow href={`/read?chapter=${ch.id}`} onClick={markFromHome}>
                      <ChapterNum>{padNum(ch.order)}</ChapterNum>
                      <ChapterTitle>{ch.title}</ChapterTitle>
                      <ChapterDate>{formatDate(ch.last_updated)}</ChapterDate>
                    </ChapterRow>
                  </motion.div>
                ))
              )}
            </LeftCol>

            {/* Right: CTA */}
            <RightCol>
              <div>
                <motion.div variants={fadeIn}>
                  <SectionLabel>Begin</SectionLabel>
                </motion.div>
                <motion.div variants={fadeUp}>
                  <CTAStack>
                    <PrimaryButton href="/read" onClick={markFromHome}>Start Reading</PrimaryButton>
                    <SecondaryButton href="/admin">Author Dashboard</SecondaryButton>
                  </CTAStack>
                </motion.div>
              </div>
            </RightCol>
          </ColumnsRow>

          {/* Footer */}
          <motion.div variants={fadeIn}>
            <Footer>
              This project is built on top of{' '}
              <a href="https://github.com/divyavenn/inklink" target="_blank" rel="noopener noreferrer">
                divya venn
              </a>
              's open-source work{' '}
              <a href="https://github.com/divyavenn/inklink" target="_blank" rel="noopener noreferrer">
                inklink
              </a>
              .
            </Footer>
          </motion.div>
        </motion.div>
      </Broadsheet>
    </Page>
  );
}
