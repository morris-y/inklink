'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Chapter } from '@/types';
import ChapterReader from './ChapterReader';
import Minimap from './Minimap';
import { BottomSheet, MOBILE_QUERY, focusRing, useMediaQuery } from '@/app/read/_mobile-ui';

const DotLottiePlayer = dynamic(
  () => import('@dotlottie/react-player').then(m => m.DotLottiePlayer),
  { ssr: false },
);

// Same paper tone as the home page (app/_home-client.tsx) so moving between them does not shift color.
const SURFACE_BASE = '#f7f5f0';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;

const Page = styled.div`
  min-height: 100dvh;
  ${SURFACE_TEXTURE}
  position: relative;
`;

const ChaptersSidebar = styled(motion.aside)`
  position: fixed;
  left: 0;
  top: 0;
  height: 100dvh;
  width: 220px;
  background-color: ${SURFACE_BASE};
  box-shadow:
    1px 0 0 rgba(26,26,24,0.04),
    4px 0 12px rgba(26,26,24,0.06),
    8px 0 32px rgba(26,26,24,0.08);
  z-index: 199;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  will-change: transform;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('/bg-texture.png');
    background-repeat: repeat;
    background-size: 100px 100px;
    pointer-events: none;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.5rem 1.5rem 0.5rem;
`;

const SidebarTitle = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(26,26,24,0.3);
`;

const ChapterList = styled.ul`
  list-style: none;
  padding: 0.5rem 0 1rem;
`;

const ChapterItem = styled.li<{ $active: boolean }>`
  padding: 0.5rem 1.5rem;
  cursor: pointer;
  transition-property: background;
  transition-duration: 0.12s;
  transition-timing-function: ease;
  border-right: 2px solid ${p => p.$active ? '#b94a36' : 'transparent'};

  &:hover {
    background: rgba(26,26,24,0.03);
  }
`;

const ChapterItemTitle = styled.div<{ $active: boolean }>`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.82rem;
  font-weight: ${p => p.$active ? '500' : '400'};
  color: ${p => p.$active ? '#1a1a18' : '#6a6a62'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* ── mobile top bar + chapter sheet ─────────────────────── */

const TopBar = styled(motion.header)`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 190;
    align-items: center;
    gap: 0.25rem;
    padding: env(safe-area-inset-top) max(0.25rem, env(safe-area-inset-right)) 0 max(0.25rem, env(safe-area-inset-left));
    ${SURFACE_TEXTURE}
    border-bottom: 1px solid rgba(26,26,24,0.08);
    will-change: transform;
  }
`;

const BarButton = styled.button`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1a1a18;
  cursor: pointer;
  ${focusRing}
  &:active { background: rgba(26,26,24,0.06); }
`;

const BarTitle = styled.div`
  flex: 1;
  min-width: 0;
  text-align: center;
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1rem;
  color: #1a1a18;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SheetTitle = styled.h2`
  margin: 0;
  padding: 0.25rem 1.25rem 0.5rem;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(26,26,24,0.45);
`;

const SheetList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 0 0.75rem;
`;

const SheetChapterButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 1.25rem;
  border: none;
  border-left: 3px solid ${p => p.$active ? '#b94a36' : 'transparent'};
  background: ${p => p.$active ? 'rgba(26,26,24,0.04)' : 'transparent'};
  text-align: left;
  cursor: pointer;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 1rem;
  font-weight: ${p => p.$active ? '500' : '400'};
  color: ${p => p.$active ? '#1a1a18' : '#6a6a62'};
  ${focusRing}
  &:focus-visible { outline-offset: -2px; }
  &:active { background: rgba(26,26,24,0.06); }
`;

const SheetChapterNum = styled.span`
  flex-shrink: 0;
  min-width: 1.5rem;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.8rem;
  color: rgba(26,26,24,0.45);
`;

const SheetChapterTitle = styled.span`
  flex: 1;
  min-width: 0;
  line-height: 1.35;
`;

// Keys this view stores on its own browser-history entries (window.history.state).
// readerDepth = chapter switches since entering /read; fromHome = the entry just
// before the first /read entry is this site's home page.
const HISTORY_DEPTH_KEY = 'inklinkReaderDepth';
const HISTORY_FROM_HOME_KEY = 'inklinkFromHome';
// Set by app/_home-client.tsx right before it links into /read.
const FROM_HOME_FLAG = 'inklink:from-home';

function readHistoryMarks(): { depth: number; fromHome: boolean } {
  const s = (typeof window !== 'undefined' ? window.history.state : null) as Record<string, unknown> | null;
  return {
    depth: typeof s?.[HISTORY_DEPTH_KEY] === 'number' ? (s[HISTORY_DEPTH_KEY] as number) : 0,
    fromHome: s?.[HISTORY_FROM_HOME_KEY] === true,
  };
}

interface ReaderViewProps {
  sessionId: string | null;
  workId: string | null;
  chapterParam?: string | null; // live ?chapter=<id>; changes on chapter switch and back/forward
}

export default function ReaderView({ sessionId, workId, chapterParam }: ReaderViewProps) {
  const router = useRouter();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reduceMotion = useReducedMotion();
  const chapterCache = useRef<Record<string, Record<string, unknown>>>({});
  const chapterContentRef = useRef<HTMLDivElement | null>(null);

  // The URL is the source of truth for the open chapter, so browser back/forward
  // (iOS swipe-back, Android back) steps through chapters.
  const currentChapterId = chapters.find(c => c.id === chapterParam)?.id ?? chapters[0]?.id ?? null;
  const currentIndex = chapters.findIndex(c => c.id === currentChapterId);
  const currentChapter = currentIndex >= 0 ? chapters[currentIndex] : null;

  const prefetchChapter = useCallback(async (id: string) => {
    if (chapterCache.current[id]) return;
    try {
      const res = await fetch(`/api/chapters/${id}`);
      if (res.ok) chapterCache.current[id] = await res.json();
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchChapters();
  }, []);

  // Mark this first /read entry when the reader arrived from the home page,
  // so the back button can return to that exact entry (keeps its scroll spot).
  useEffect(() => {
    let fromHome = false;
    try {
      fromHome = sessionStorage.getItem(FROM_HOME_FLAG) === '1';
      sessionStorage.removeItem(FROM_HOME_FLAG);
    } catch { /* storage blocked */ }
    if (fromHome) {
      window.history.replaceState(
        { ...(window.history.state ?? {}), [HISTORY_FROM_HOME_KEY]: true, [HISTORY_DEPTH_KEY]: 0 },
        '',
      );
    }
  }, []);

  // New chapter → start at the top.
  useEffect(() => {
    if (currentChapterId) window.scrollTo(0, 0);
    setBarHidden(false);
  }, [currentChapterId]);

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters?includeFirst=1');
      const data = await response.json();
      const chapterList: Chapter[] = data.chapters ?? [];
      setChapters(chapterList);

      // Store prefetched first chapter in cache
      if (data.firstChapter) {
        const firstId = chapterList[0]?.id;
        if (firstId) chapterCache.current[firstId] = data.firstChapter;
      }

      // Background-prefetch all remaining chapters
      for (const ch of chapterList.slice(1)) {
        prefetchChapter(ch.id);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Each chapter switch is its own history entry. Native pushState (supported by
  // the App Router; useSearchParams follows it) is used instead of router.push
  // because router.push drops custom history.state, which holds the depth that
  // the back button needs. It also skips a server round trip for the same page.
  const navigateToChapter = useCallback((id: string) => {
    if (id === currentChapterId) return;
    const { depth, fromHome } = readHistoryMarks();
    const params = new URLSearchParams(window.location.search);
    params.set('chapter', id);
    window.history.pushState(
      { [HISTORY_DEPTH_KEY]: depth + 1, [HISTORY_FROM_HOME_KEY]: fromHome },
      '',
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [currentChapterId]);

  const goBack = useCallback(() => {
    const { depth, fromHome } = readHistoryMarks();
    if (fromHome) {
      window.history.go(-(depth + 1));
    } else {
      router.push('/');
    }
  }, [router]);

  // Mobile top bar hides while scrolling down, comes back on scroll up.
  useEffect(() => {
    if (!isMobile) return;
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const dy = y - lastY;
        if (y < 64) setBarHidden(false);
        else if (dy > 8) setBarHidden(true);
        else if (dy < -8) setBarHidden(false);
        if (Math.abs(dy) > 8 || y < 64) lastY = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isMobile]);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  if (loading) return (
    <Page style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DotLottiePlayer src="/loading.lottie" autoplay loop style={{ width: 120, height: 120 }} />
    </Page>
  );

  return (
    <Page>
      {isMobile && (
        <TopBar
          initial={false}
          animate={{ y: barHidden && !sheetOpen ? '-100%' : '0%' }}
          transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: 'easeOut' }}
        >
          <BarButton type="button" aria-label="返回" onClick={goBack}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </BarButton>
          <BarTitle>{currentChapter?.title ?? ''}</BarTitle>
          <BarButton
            type="button"
            aria-label="章節列表"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 7h12M8 12h12M8 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="4.5" cy="7" r="1" fill="currentColor" />
              <circle cx="4.5" cy="12" r="1" fill="currentColor" />
              <circle cx="4.5" cy="17" r="1" fill="currentColor" />
            </svg>
          </BarButton>
        </TopBar>
      )}

      <Minimap contentRef={chapterContentRef} onHoverStart={() => setSidebarOpen(true)} />

      <AnimatePresence>
        {sidebarOpen && !isMobile && (
          <ChaptersSidebar
            key="sidebar"
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ type: 'tween', duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            onMouseLeave={() => setSidebarOpen(false)}
          >
            <SidebarHeader>
              <SidebarTitle>Chapters</SidebarTitle>
            </SidebarHeader>
            <ChapterList>
              {chapters.map(chapter => (
                <ChapterItem
                  key={chapter.id}
                  $active={chapter.id === currentChapterId}
                  onClick={() => {
                    navigateToChapter(chapter.id);
                    setSidebarOpen(false);
                  }}
                >
                  <ChapterItemTitle $active={chapter.id === currentChapterId}>
                    {chapter.title}
                  </ChapterItemTitle>
                </ChapterItem>
              ))}
            </ChapterList>
          </ChaptersSidebar>
        )}
      </AnimatePresence>

      <BottomSheet open={isMobile && sheetOpen} onClose={closeSheet} label="章節列表">
        <SheetTitle>Chapters</SheetTitle>
        <SheetList>
          {chapters.map((chapter, i) => (
            <li key={chapter.id}>
              <SheetChapterButton
                type="button"
                $active={chapter.id === currentChapterId}
                aria-current={chapter.id === currentChapterId ? 'page' : undefined}
                onClick={() => {
                  navigateToChapter(chapter.id);
                  setSheetOpen(false);
                }}
              >
                <SheetChapterNum>{String(i + 1).padStart(2, '0')}</SheetChapterNum>
                <SheetChapterTitle>{chapter.title}</SheetChapterTitle>
              </SheetChapterButton>
            </li>
          ))}
        </SheetList>
      </BottomSheet>

      <AnimatePresence mode="wait">
        {currentChapterId && (
          <ChapterReader
            key={currentChapterId}
            chapterId={currentChapterId}
            sessionId={sessionId}
            workId={workId}
            prefetchedData={chapterCache.current[currentChapterId]}
            prevChapterId={chapters[currentIndex - 1]?.id ?? null}
            nextChapterId={chapters[currentIndex + 1]?.id ?? null}
            onNavigate={navigateToChapter}
            contentElRef={chapterContentRef}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
