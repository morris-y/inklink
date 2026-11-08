'use client';

// Small building blocks for the reader's phone layout (max-width 768px).
// Kept next to the /read route because only the reader uses them.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';

export const MOBILE_QUERY = '(max-width: 768px)';

// Same paper and ink as ReaderView / ChapterReader.
const PAPER = '#f7f5f0';
const INK = '#1a1a18';

export const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: 2px;
  }
`;

/** Tracks a media query. Starts false on the server and on the first client render. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Stops the page behind an open sheet from scrolling. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = prevOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, [active]);
}

/** Height of the on-screen keyboard (0 when closed), from the visual viewport. */
export function useKeyboardInset(active: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) {
      setInset(0);
      return;
    }
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);
  return inset;
}

/* ── bottom sheet ─────────────────────────────────────── */

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 10001;
`;

const Sheet = styled(motion.div)`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10002;
  max-height: calc(100dvh - env(safe-area-inset-top) - 2rem);
  display: flex;
  flex-direction: column;
  background-color: ${PAPER};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
  border-radius: 14px 14px 0 0;
  box-shadow:
    0 -1px 0 rgba(26, 26, 24, 0.06),
    0 -8px 32px rgba(26, 26, 24, 0.12);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  outline: none;
  touch-action: pan-y;
`;

const HandleZone = styled.div`
  flex-shrink: 0;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
`;

const Handle = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(26, 26, 24, 0.18);
`;

const SheetBody = styled.div`
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/**
 * Slides up from the bottom. Closes on backdrop tap, Escape, or dragging the
 * handle down. Locks body scroll and lifts above the on-screen keyboard.
 * `data-toolbar` keeps ChapterReader's document mouseup handler from treating
 * taps inside as "click away from the selection".
 */
export function BottomSheet({ open, onClose, label, children }: BottomSheetProps) {
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset(open);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Move focus into the sheet unless a child already took it (autoFocus).
    const t = window.setTimeout(() => {
      if (sheetRef.current && !sheetRef.current.contains(document.activeElement)) {
        sheetRef.current.focus({ preventScroll: true });
      }
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) onClose();
  };

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop
            key="sheet-backdrop"
            data-toolbar
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />
          <Sheet
            key="sheet"
            ref={sheetRef}
            data-toolbar
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={transition}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            style={keyboardInset > 0 ? { bottom: keyboardInset, paddingBottom: 0 } : undefined}
          >
            <HandleZone onPointerDown={e => dragControls.start(e)} aria-hidden="true">
              <Handle />
            </HandleZone>
            <SheetBody>{children}</SheetBody>
          </Sheet>
        </>
      )}
    </AnimatePresence>
  );
}
