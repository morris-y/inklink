'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Chapter } from '@/types';
import ChapterReader from './ChapterReader';
import Minimap from './Minimap';

const DotLottiePlayer = dynamic(
  () => import('@dotlottie/react-player').then(m => m.DotLottiePlayer),
  { ssr: false },
);

const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;

const Page = styled.div`
  min-height: 100vh;
  ${SURFACE_TEXTURE}
  position: relative;
`;

const ChaptersSidebar = styled(motion.aside)`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
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

const MobileWarning = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: ${SURFACE_BASE};
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    font-family: var(--font-inter), system-ui, sans-serif;
    color: #2a2a26;
    flex-direction: column;
    gap: 1rem;
  }
`;

const MobileWarningTitle = styled.div`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.25rem;
  color: #1a1a18;
`;

const MobileWarningText = styled.div`
  font-size: 0.85rem;
  color: rgba(26,26,24,0.5);
  line-height: 1.6;
  max-width: 280px;
`;

const MobileDismissBtn = styled.button`
  margin-top: 0.5rem;
  padding: 0.5rem 1.5rem;
  border: 1px solid rgba(26,26,24,0.15);
  border-radius: 6px;
  background: transparent;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.8rem;
  color: #2a2a26;
  cursor: pointer;

  &:hover {
    background: rgba(26,26,24,0.04);
  }
`;

interface ReaderViewProps {
  sessionId: string | null;
  workId: string | null;
}

export default function ReaderView({ sessionId, workId }: ReaderViewProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chapterCache = useRef<Record<string, Record<string, unknown>>>({});
  const chapterContentRef = useRef<HTMLDivElement | null>(null);

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

      if (chapterList.length > 0) setCurrentChapterId(chapterList[0].id);

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

  if (loading) return (
    <Page style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DotLottiePlayer src="/loading.lottie" autoplay loop style={{ width: 120, height: 120 }} />
    </Page>
  );

  return (
    <Page>
      {!mobileWarningDismissed && (
        <MobileWarning>
          <MobileWarningTitle>Best on desktop</MobileWarningTitle>
          <MobileWarningText>
            InkLink's annotation features are designed for desktop browsers. Please visit on a computer for the full experience.
          </MobileWarningText>
          <MobileDismissBtn onClick={() => setMobileWarningDismissed(true)}>
            Continue anyway
          </MobileDismissBtn>
        </MobileWarning>
      )}

      <Minimap contentRef={chapterContentRef} onHoverStart={() => setSidebarOpen(true)} />

      <AnimatePresence>
        {sidebarOpen && (
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
                    setCurrentChapterId(chapter.id);
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

      <AnimatePresence mode="wait">
        {currentChapterId && (
          <ChapterReader
            key={currentChapterId}
            chapterId={currentChapterId}
            sessionId={sessionId}
            workId={workId}
            prefetchedData={chapterCache.current[currentChapterId]}
            prevChapterId={chapters[chapters.findIndex(c => c.id === currentChapterId) - 1]?.id ?? null}
            nextChapterId={chapters[chapters.findIndex(c => c.id === currentChapterId) + 1]?.id ?? null}
            onNavigate={setCurrentChapterId}
            contentElRef={chapterContentRef}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
