'use client';

import { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { Chapter } from '@/types';
import ChapterReader from './ChapterReader';

const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;

const Desktop = styled.div`
  min-height: 100vh;
  padding: 3% 10% 10% 10%;
  background-color: #302f2f;
  display: flex;
  flex-direction: column;
`;

const Shell = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 2%;
  background: transparent;
`;

const Panel = styled.div`
  display: flex;
  flex: 1;
  ${SURFACE_TEXTURE}
  border-radius: 6px 6px 6px 6px;
  overflow: hidden;
  min-height: 0;
  position: relative;
  z-index: 1;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const Sidebar = styled(motion.aside)`
  width: 220px;
  background: rgba(26,26,24,0.025);
  border-left: 1px solid rgba(26,26,24,0.06);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
`;

const SidebarHeader = styled.div`
  padding: 1.5rem 1.5rem 0.5rem;
  display: flex;
  align-items: center;
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
  transition: all 0.12s ease;
  border-right: 2px solid ${p => p.$active ? '#b94a36' : 'transparent'};
  background: transparent;

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

interface ReaderViewProps {
  sessionId: string;
}

export default function ReaderView({ sessionId }: ReaderViewProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      const data = await response.json();
      setChapters(data.chapters);
      if (data.chapters.length > 0) {
        setCurrentChapterId(data.chapters[0].id);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Desktop />;
  }

  return (
    <Desktop>
      <Shell>
        <Panel>
          <ContentArea>
            <AnimatePresence mode="wait">
              {currentChapterId && (
                <ChapterReader
                  key={currentChapterId}
                  chapterId={currentChapterId}
                  sessionId={sessionId}
                />
              )}
            </AnimatePresence>
          </ContentArea>

          <Sidebar
            initial={{ x: 220 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SidebarHeader>
              <SidebarTitle>Chapters</SidebarTitle>
            </SidebarHeader>
            <ChapterList>
              {chapters.map(chapter => (
                <ChapterItem
                  key={chapter.id}
                  $active={chapter.id === currentChapterId}
                  onClick={() => setCurrentChapterId(chapter.id)}
                >
                  <ChapterItemTitle $active={chapter.id === currentChapterId}>
                    {chapter.title}
                  </ChapterItemTitle>
                </ChapterItem>
              ))}
            </ChapterList>
          </Sidebar>
        </Panel>
      </Shell>
    </Desktop>
  );
}
