'use client';

import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';

const MinimapContainer = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 38px;
  z-index: 198;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 0;
  cursor: pointer;

  @media (max-width: 768px) {
    display: none;
  }
`;

const MinimapInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 8px;
`;

const MinimapLine = styled.div<{ $active: boolean; $width: number }>`
  height: 3px;
  border-radius: 2px;
  background: ${p => p.$active ? 'rgba(26,26,24,0.5)' : 'rgba(26,26,24,0.15)'};
  width: ${p => Math.max(8, p.$width)}px;
  transition: background 0.2s ease, width 0.2s ease;
`;

interface MinimapProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
  onHoverStart: () => void;
}

export default function Minimap({ contentRef, onHoverStart }: MinimapProps) {
  const [paragraphs, setParagraphs] = useState<{ length: number }[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Parse paragraphs from rendered content using MutationObserver
  useEffect(() => {
    const parseContent = () => {
      if (!contentRef.current) return;
      const els = contentRef.current.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6');
      const pData = Array.from(els).map(el => ({
        length: (el.textContent || '').length,
      }));
      if (pData.length > 0) setParagraphs(pData);
    };

    // Initial parse (may need a small delay for ref to be assigned)
    parseContent();
    const timer = setTimeout(parseContent, 200);

    // Watch for content changes via MutationObserver
    const observer = new MutationObserver(parseContent);
    const checkRef = setInterval(() => {
      if (contentRef.current) {
        clearInterval(checkRef);
        observer.observe(contentRef.current, { childList: true, subtree: true });
        parseContent();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(checkRef);
      observer.disconnect();
    };
  }, []);

  // Track which paragraph is in view
  useEffect(() => {
    const onScroll = () => {
      if (!contentRef.current) return;
      const els = contentRef.current.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6');
      const viewCenter = window.innerHeight / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      els.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - viewCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      });
      setActiveIdx(closestIdx);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [paragraphs.length]);

  const handleClick = (idx: number) => {
    if (!contentRef.current) return;
    const els = contentRef.current.querySelectorAll('p, blockquote, h1, h2, h3, h4, h5, h6');
    if (els[idx]) {
      els[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (paragraphs.length === 0) return null;

  const maxLen = Math.max(...paragraphs.map(p => p.length));

  return (
    <MinimapContainer onMouseEnter={onHoverStart}>
      <MinimapInner>
        {paragraphs.map((p, i) => (
          <MinimapLine
            key={i}
            $active={i === activeIdx}
            $width={Math.round((p.length / maxLen) * 22)}
            onClick={() => handleClick(i)}
          />
        ))}
      </MinimapInner>
    </MinimapContainer>
  );
}
