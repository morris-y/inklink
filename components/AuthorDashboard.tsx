'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styled, { css, keyframes } from 'styled-components';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import AnimateNumber from './AnimateNumber';
import { Chapter } from '@/types';
import LikesHeatmapView, { HeatmapRange } from './LikesHeatmapView';
import CommentsView from './CommentsView';
import VersionTimeline from './VersionTimeline';
import RetentionView, { RetentionData, InterestSignup } from './RetentionView';
import { useApi, primeCache } from '@/lib/useApi';

const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;
const INACTIVE_TAB_SURFACES = ['#d0ccc4', '#b5b2ad', '#9a9997'];
const INK = '#1a1a18';
const ACCENT = '#b94a36';

/* Phones and small tablets get an app layout: fixed top bar, bottom tab bar, one scrolling column. */
const MOBILE = '@media (max-width: 768px)';
const TOPBAR_H = 44;
const TABBAR_H = 56;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: 2px;
  }
`;

/* ─── Desktop ────────────────────────────────────────────────────────────── */

const Desktop = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  padding: 3% 10% 10% 10%;
  background-color: #302f2f;
  display: flex;
  flex-direction: column;

  ${MOBILE} {
    ${SURFACE_TEXTURE}
    padding: calc(${TOPBAR_H}px + env(safe-area-inset-top)) env(safe-area-inset-right)
      calc(${TABBAR_H}px + env(safe-area-inset-bottom)) env(safe-area-inset-left);
  }
`;

/* ─── Outer shell: holds both tab row and panel, gets the outer margin ────── */

const Shell = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 2%;
  background: transparent;

  ${MOBILE} {
    padding: 0;
  }
`;

/* ─── Tab row ─────────────────────────────────────────────────────────────── */

const TAB_H = 50;
const CORNER_TAB_W = 179; /* corner_tab.svg: 579×162 scaled to h=50 */
const FOLDER_TAB_W = 201; /* folder_tab.svg: 652×162 scaled to h=50 */
const TAB_OVERLAP = 22;   /* shoulder width at this scale */
const INACTIVE_OVERLAP = 8; /* smaller overlap between inactive tabs */

const TabRow = styled.div`
  position: relative;
  display: flex;
  align-items: flex-end;
  z-index: 3;

  ${MOBILE} {
    display: none;
  }
`;

const InactiveTab = styled.button<{ $dist?: number }>`
  position: relative;
  height: ${TAB_H - 10}px;
  padding: 0 1.6rem;
  border: none;
  border-radius: 6px 6px 0 0;
  ${SURFACE_TEXTURE}
  background-color: ${p => INACTIVE_TAB_SURFACES[Math.min((p.$dist ?? 1) - 1, INACTIVE_TAB_SURFACES.length - 1)]};
  color: rgba(26,26,24,0.45);
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 400;
  cursor: pointer;
  z-index: ${p => Math.max(0, 3 - (p.$dist ?? 1))};

  &:hover {
    background-color: #ebe6dd;
    color: rgba(26,26,24,0.78);
  }
  ${focusRing}
`;

const ActiveTabWrap = styled.div<{ $w: number }>`
  position: relative;
  width: ${p => p.$w}px;
  height: ${TAB_H}px;
  z-index: 4;
  flex-shrink: 0;
  margin-bottom: -2px;
`;

const ActiveTabSurface = styled.div<{ $mask: string }>`
  position: absolute;
  inset: 0;
  ${SURFACE_TEXTURE}
  background-color: ${SURFACE_BASE};

  -webkit-mask-image: url('${p => p.$mask}');
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;

  mask-image: url('${p => p.$mask}');
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
`;

const ActiveTabLabel = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 500;
  color: #1a1a18;
`;

/* ─── Panel: the content surface, gets the shadow ────────────────────────── */

const Panel = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  z-index: 1;

  ${SURFACE_TEXTURE}
  background-color: ${SURFACE_BASE};
  border-radius: 0 10px 10px 10px;

  ${MOBILE} {
    display: block;
    flex: none;
    overflow: visible;
    border-radius: 0;
    background: transparent;
  }
`;

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */

const Sidebar = styled(motion.aside)`
  width: 220px;
  background: rgba(26,26,24,0.025);
  border-right: 1px solid rgba(26,26,24,0.06);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;

  ${MOBILE} {
    display: none;
  }
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
  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: -2px;
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

/* ─── Content area ────────────────────────────────────────────────────────── */

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${MOBILE} {
    display: block;
    overflow: visible;
  }
`;

const ContentHeader = styled.div`
  padding: 1.75rem 2.5rem 0;

  ${MOBILE} {
    padding: 1rem 16px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 0;
`;

const ContentMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;

  ${MOBILE} {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
`;

const ChapterTitleText = styled.h1`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.45rem;
  font-weight: 400;
  font-style: italic;
  color: #1a1a18;
  margin: 0;
`;

const HeaderStats = styled.div`
  display: flex;
  gap: 1.75rem;
  align-items: center;

  ${MOBILE} {
    flex-wrap: wrap;
    gap: 0.4rem 1.1rem;
  }
`;

const Stat = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.01em;
  color: rgba(26,26,24,0.38);
  display: flex;
  gap: 0.35rem;
  align-items: center;

  strong {
    color: #1a1a18;
    font-weight: 500;
  }
`;

const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 2.5rem 2.5rem;

  ${MOBILE} {
    overflow: visible;
    padding: 1.25rem 16px 2rem;
  }
`;

const ContentTransition = styled(motion.div)`
  width: 100%;
`;

/* ─── Empty / loading states ──────────────────────────────────────────────── */

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #9a9892;

  h3 {
    font-family: var(--font-playfair), Georgia, serif;
    font-weight: 400;
    font-style: italic;
    font-size: 1.4rem;
    color: #5a5a54;
    margin-bottom: 0.5rem;
  }

  p {
    font-family: var(--font-inter), system-ui, sans-serif;
    font-size: 0.875rem;
  }
`;

const LoadingText = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  text-align: center;
  padding: 3rem;
  color: #9a9892;
  font-size: 0.875rem;
`;

/* ─── Login overlay ───────────────────────────────────────────────────────── */

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px); }
  30% { transform: translateX(5px); }
  45% { transform: translateX(-4px); }
  60% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
  90% { transform: translateX(1px); }
`;

const LoginOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(240,236,228,0.45);
  backdrop-filter: blur(3px) saturate(1.1);
  -webkit-backdrop-filter: blur(3px) saturate(1.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const LoginCard = styled.form<{ $shake?: boolean }>`
  background: rgba(245,241,235,0.85);
  border: 1px solid rgba(26,26,24,0.08);
  border-radius: 6px;
  padding: 1.25rem 1.5rem;
  width: 260px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
  font-family: var(--font-inter), system-ui, sans-serif;
  animation: ${p => p.$shake ? css`${shake} 0.4s ease` : 'none'};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  ${MOBILE} {
    width: min(320px, calc(100vw - 32px));
    padding: 1rem;
  }
`;

const LoginInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.6rem;
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(26,26,24,0.12);
  border-radius: 4px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.8rem;
  color: #3a3a36;
  outline: none;
  box-sizing: border-box;
  &::placeholder { color: rgba(26,26,24,0.3); }
  &:focus { border-color: rgba(26,26,24,0.3); }
  ${focusRing}

  /* 16px keeps iOS Safari from zooming the page when the field gets focus. */
  ${MOBILE} {
    font-size: 16px;
    min-height: 44px;
  }
`;

const LoginButton = styled.button`
  padding: 0.5rem 0.85rem;
  background: #3a3a36;
  color: #f2ede4;
  border: none;
  border-radius: 4px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s ease;
  &:hover { background: #1a1a18; }
  ${focusRing}

  ${MOBILE} {
    min-height: 44px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
`;

/* ─── Component ───────────────────────────────────────────────────────────── */

/* ─── Filter dropdown ─────────────────────────────────────────────────────── */

const FilterArea = styled.div`
  margin-left: auto;
  display: flex;
  align-items: flex-end;
  padding-bottom: 6px;
`;

const FilterSelect = styled.select`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: rgba(26,26,24,0.65);
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(26,26,24,0.14);
  border-radius: 4px;
  padding: 0.3rem 1.6rem 0.3rem 0.6rem;
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(26,26,24,0.35)'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  min-width: 160px;

  &:hover { border-color: rgba(26,26,24,0.3); color: #1a1a18; }
  &:focus { border-color: rgba(26,26,24,0.4); }
  ${focusRing}

  optgroup {
    font-weight: 600;
    font-size: 0.68rem;
    color: rgba(26,26,24,0.4);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

/* ─── Mobile chrome: top bar, bottom tab bar, chapter/reader pickers ─────── */

const TopBar = styled.header`
  display: none;

  ${MOBILE} {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: calc(${TOPBAR_H}px + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) max(4px, env(safe-area-inset-right)) 0 max(4px, env(safe-area-inset-left));
    ${SURFACE_TEXTURE}
    border-bottom: 1px solid rgba(26,26,24,0.06);
  }
`;

const BackButton = styled.button`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${INK};
  cursor: pointer;
  ${focusRing}

  &:active { background: rgba(26,26,24,0.06); }
`;

const TopBarTitle = styled.div`
  text-align: center;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: ${INK};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TabBar = styled.nav`
  display: none;

  ${MOBILE} {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    height: calc(${TABBAR_H}px + env(safe-area-inset-bottom));
    padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    ${SURFACE_TEXTURE}
    border-top: 1px solid rgba(26,26,24,0.08);
  }
`;

const TabBarButton = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: ${p => p.$active ? INK : 'rgba(26,26,24,0.45)'};
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: ${p => p.$active ? 500 : 400};
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: color 0.15s ease;
  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: -4px;
    border-radius: 8px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 30%;
    right: 30%;
    height: 2px;
    background: ${ACCENT};
    transform: scaleX(${p => p.$active ? 1 : 0});
    opacity: ${p => p.$active ? 1 : 0};
    transition: transform 0.2s ease, opacity 0.2s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before { transition: none; }
  }
`;

const MobileControls = styled.div`
  display: none;

  ${MOBILE} {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 16px 0;
  }
`;

const MobileSelect = styled(FilterSelect)`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  font-size: 16px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  background-position: right 0.85rem center;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

type ViewType = 'likes' | 'comments' | 'retention';

const VIEWS: { key: ViewType; label: string; shortLabel: string; hash: string }[] = [
  { key: 'likes', label: 'Heatmap', shortLabel: 'Heatmap', hash: 'heatmap' },
  { key: 'comments', label: 'Comments & Edits', shortLabel: 'Comments', hash: 'comments' },
  { key: 'retention', label: 'Retention', shortLabel: 'Retention', hash: 'retention' },
];

const viewFromHash = (hash: string): ViewType | null =>
  VIEWS.find(v => v.hash === hash.replace(/^#/, ''))?.key ?? null;

/** True when the history entry before this one is the site's home page. */
function previousEntryIsHome(): boolean {
  const isHome = (href: string) => {
    const u = new URL(href, window.location.href);
    return u.origin === window.location.origin && u.pathname === '/';
  };
  try {
    // Navigation API sees client-side (Next Link) navigations; document.referrer only sees full page loads.
    const nav = (window as unknown as { navigation?: { currentEntry?: { index: number }; entries?: () => { url: string | null }[] } }).navigation;
    if (nav?.currentEntry && typeof nav.entries === 'function') {
      const prev = nav.entries()[nav.currentEntry.index - 1];
      return !!prev?.url && isHome(prev.url);
    }
    return !!document.referrer && isHome(document.referrer);
  } catch {
    return false;
  }
}

const TabIcon = ({ view }: { view: ViewType }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {view === 'likes' && (<><path d="M4 5h12" /><path d="M4 10h9" /><path d="M4 15h11" /></>)}
    {view === 'comments' && <path d="M4 4.5h12v8H9l-3.5 3v-3H4z" />}
    {view === 'retention' && <path d="M3 4v12h14M5.5 7l3 3 2.5-2 4 4.5" />}
  </svg>
);

interface HeatmapLine {
  lineNumber: number;
  lineText: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  readerReachPercent: number;
}

interface DashComment {
  id: string;
  body: string;
  selected_text: string | null;
  char_start: number | null;
  char_length: number | null;
  word_start: number | null;
  word_end: number | null;
  created_at: string;
  reader_name: string | null;
  reader_slug: string | null;
}

interface DashSuggestion {
  id: string;
  original_text: string;
  suggested_text: string;
  rationale: string | null;
  char_start: number | null;
  char_length: number | null;
  word_start: number | null;
  word_end: number | null;
  created_at: string;
  reader_name: string | null;
}

/* ─── Retention view ──────────────────────────────────────────────────── */


export default function AuthorDashboard({ isProtected = false }: { isProtected?: boolean }) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterVersionId, setChapterVersionId] = useState<string | null>(null);
  const [chapterHtml, setChapterHtml] = useState<string>('');
  const [contentChapterId, setContentChapterId] = useState<string | null>(null);
  const [displayedCommitSha, setDisplayedCommitSha] = useState<string>('');
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('likes');
  const [currentCommitSha, setCurrentCommitSha] = useState<string>('');
  const [needsLogin, setNeedsLogin] = useState(isProtected);
  const [loginPassword, setLoginPassword] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const router = useRouter();

  // Active tab lives in the URL hash (#heatmap, #comments, #retention) so reloads and shared links keep it.
  useEffect(() => {
    const syncFromHash = () => {
      const v = viewFromHash(window.location.hash);
      if (v) setActiveView(v);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  // replaceState, not push: like a native tab bar, switching tabs is not a back-stack step,
  // so the browser back button leaves the dashboard instead of replaying tab switches.
  const selectView = useCallback((view: ViewType) => {
    setActiveView(view);
    const hash = VIEWS.find(v => v.key === view)?.hash;
    if (hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hash}`);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (previousEntryIsHome()) router.back();
    else router.push('/');
  }, [router]);

  // Check if already authed via cookie
  useEffect(() => {
    if (!isProtected) return;
    fetch('/api/dashboard/login').then(res => {
      if (res.ok) setNeedsLogin(false);
    }).catch(() => {});
  }, [isProtected]);
  const [filterValue, setFilterValue] = useState('all');
  const [chapterIdsAtCommit, setChapterIdsAtCommit] = useState<string[] | null>(null);

  // ─── Cached API calls ──────────────────────────────────────────────────────
  const { data: chaptersData, loading } = useApi<{ chapters: Chapter[] }>('/api/chapters');
  const chapters = chaptersData?.chapters || [];

  const { data: readersData } = useApi<{ readers: { id: string; display_name: string }[] }>('/api/dashboard/readers');
  const readers = readersData?.readers || [];

  const { data: groupsData } = useApi<{ groups: { id: string; name: string }[] }>('/api/dashboard/groups');
  const groups = groupsData?.groups || [];

  const { data: signupsData } = useApi<{ signups: InterestSignup[] }>('/api/dashboard/interest-signups');
  const interestSignups = signupsData?.signups || [];

  const buildFilterParams = useCallback((filter: string) => {
    if (!filter || filter === 'all') return '';
    const [type, id] = filter.split(':');
    if (type === 'reader') return `?readerProfileId=${id}`;
    if (type === 'group')  return `?readerGroupId=${id}`;
    return '';
  }, []);

  const heatmapUrl = chapterVersionId
    ? `/api/dashboard/chapter-versions/${chapterVersionId}/heatmap${buildFilterParams(filterValue)}`
    : null;
  const feedbackUrl = chapterVersionId
    ? `/api/dashboard/chapter-versions/${chapterVersionId}/feedback${buildFilterParams(filterValue)}`
    : null;
  const retentionUrl = chapterVersionId
    ? `/api/dashboard/chapter-versions/${chapterVersionId}/retention`
    : null;

  const { data: heatmapData, mutate: mutateHeatmap } = useApi<{
    heatmap: HeatmapLine[];
    ranges: HeatmapRange[];
    totalLikes: number;
    totalDislikes: number;
  }>(heatmapUrl);

  const { data: feedbackData, mutate: mutateFeedback } = useApi<{
    comments: DashComment[];
    suggestions: DashSuggestion[];
  }>(feedbackUrl);

  const { data: retentionData } = useApi<RetentionData>(retentionUrl);

  const heatmapLines = heatmapData?.heatmap || [];
  const heatmapRanges = heatmapData?.ranges || [];
  const totalLikes = heatmapData?.totalLikes ?? 0;
  const totalDislikes = heatmapData?.totalDislikes ?? 0;
  const dashComments = feedbackData?.comments || [];
  const dashSuggestions = feedbackData?.suggestions || [];

  // Auto-select first chapter once loaded
  useEffect(() => {
    if (chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  useEffect(() => {
    if (selectedChapterId) {
      setDisplayedCommitSha('');
      fetchChapterContent(selectedChapterId);
    }
  }, [selectedChapterId]);

  const handleDeleteFeedback = async (id: string, type: 'comment' | 'suggestion') => {
    try {
      const res = await fetch(`/api/dashboard/feedback/${id}?type=${type}`, { method: 'DELETE' });
      if (res.ok) {
        mutateFeedback(prev => {
          if (!prev) return prev;
          return {
            comments: type === 'comment' ? prev.comments.filter(c => c.id !== id) : prev.comments,
            suggestions: type === 'suggestion' ? prev.suggestions.filter(s => s.id !== id) : prev.suggestions,
          };
        });
      }
    } catch (err) {
      console.error('Delete feedback error:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/dashboard/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword }),
    });
    if (res.ok) {
      setNeedsLogin(false);
      setLoginPassword('');
    } else {
      setLoginPassword('');
      setShakeKey(k => k + 1);
    }
  };

  const fetchChapterContent = async (chapterId: string, commitSha?: string) => {
    setLoadingChapter(true);
    try {
      const url = commitSha
        ? `/api/chapters/${chapterId}/versions/${commitSha}`
        : `/api/chapters/${chapterId}`;
      const response = await fetch(url);
      const data = await response.json();
      const nextCommitSha = commitSha || data.version?.commitSha || data.commitSha || '';

      // Prime the cache so useApi picks it up instantly on re-visit
      primeCache(url, data);

      setChapterHtml(data.html || '');
      setContentChapterId(chapterId);
      setDisplayedCommitSha(nextCommitSha);
      if (data.versionId) {
        setChapterVersionId(data.versionId);
      }

      // Track which chapters exist at this commit (null = show all / latest)
      if (data.chapterIdsAtCommit) {
        setChapterIdsAtCommit(data.chapterIdsAtCommit);
      } else if (!commitSha) {
        setChapterIdsAtCommit(null); // latest version: show all
      }

      if (!commitSha) {
        setCurrentCommitSha(data.commitSha || '');
      }
    } catch (error) {
      console.error('Error fetching chapter content:', error);
    } finally {
      setLoadingChapter(false);
    }
  };

  const chapterStats = {
    likes: totalLikes,
    dislikes: totalDislikes,
    comments: dashComments.length,
    edits: dashSuggestions.length,
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);
  const visibleChapters = chapters.filter(ch => !chapterIdsAtCommit || chapterIdsAtCommit.includes(ch.id));
  const activeLabel = VIEWS.find(v => v.key === activeView)?.label ?? 'Dashboard';
  const hasReaderFilter = readers.length > 0 || groups.length > 0;
  const filterOptions = (
    <>
      <option value="all">All readers</option>
      {groups.length > 0 && (
        <optgroup label="Groups">
          {groups.map(g => (
            <option key={g.id} value={`group:${g.id}`}>{g.name}</option>
          ))}
        </optgroup>
      )}
      {readers.length > 0 && (
        <optgroup label="Readers">
          {readers.map(r => (
            <option key={r.id} value={`reader:${r.id}`}>{r.display_name}</option>
          ))}
        </optgroup>
      )}
    </>
  );
  // Key on view tab only — chapter and version changes update props without remounting
  const activeContentKey = activeView;
  const shouldShowLoadingState = loadingChapter && contentChapterId !== selectedChapterId;

  return (
    <MotionConfig reducedMotion="user">
    <Desktop style={needsLogin ? { pointerEvents: 'none', userSelect: 'none' } : undefined}>
      <TopBar>
        <BackButton type="button" aria-label="返回" onClick={handleBack}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13.5 4.5 7 11l6.5 6.5" />
          </svg>
        </BackButton>
        <TopBarTitle>{activeLabel}</TopBarTitle>
        <span aria-hidden="true" />
      </TopBar>

      <Shell>
        {/* Tab row sits at the top of the shell */}
        <TabRow>
          {(() => {
            const tabs = VIEWS.map((v, i) => ({
              ...v,
              w: i === 0 ? CORNER_TAB_W : FOLDER_TAB_W,
              mask: i === 0 ? '/corner_tab.svg' : '/folder_tab.svg',
            }));
            const activeIdx = tabs.findIndex(t => t.key === activeView);
            return tabs.map((tab, i) => {
              // First tab has no margin; tabs adjacent to active get full overlap; others get small overlap
              const ml = i === 0 ? 0 : (i === activeIdx || i - 1 === activeIdx) ? -TAB_OVERLAP : -INACTIVE_OVERLAP;
              if (tab.key === activeView) {
                return (
                  <ActiveTabWrap key={tab.key} $w={tab.w} style={{ marginLeft: ml }}>
                    <ActiveTabSurface $mask={tab.mask} />
                    <ActiveTabLabel>{tab.label}</ActiveTabLabel>
                  </ActiveTabWrap>
                );
              }
              const dist = Math.abs(i - activeIdx);
              return (
                <InactiveTab key={tab.key} $dist={dist} style={{ marginLeft: ml }} onClick={() => selectView(tab.key)}>{tab.label}</InactiveTab>
              );
            });
          })()}

          {hasReaderFilter && (
            <FilterArea>
              <FilterSelect
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                aria-label="Filter by reader"
              >
                {filterOptions}
              </FilterSelect>
            </FilterArea>
          )}
        </TabRow>

        {/* Panel shares background with the active tab, gets the shadow */}
        <Panel>
          {/* Content */}
          <ContentArea>
            {loading ? (
              <LoadingText>Loading...</LoadingText>
            ) : !selectedChapterId || chapters.length === 0 ? (
              <EmptyState>
                <h3>No chapters yet</h3>
                <p>Add chapters to start collecting feedback</p>
              </EmptyState>
            ) : (
              <>
                <MobileControls>
                  <label>
                    <VisuallyHidden>Chapter</VisuallyHidden>
                    <MobileSelect
                      value={selectedChapterId ?? ''}
                      onChange={e => setSelectedChapterId(e.target.value)}
                    >
                      {visibleChapters.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.title}</option>
                      ))}
                    </MobileSelect>
                  </label>
                  {hasReaderFilter && (
                    <label>
                      <VisuallyHidden>Filter by reader</VisuallyHidden>
                      <MobileSelect value={filterValue} onChange={e => setFilterValue(e.target.value)}>
                        {filterOptions}
                      </MobileSelect>
                    </label>
                  )}
                </MobileControls>

                <ContentHeader>
                  <ContentMeta>
                    <ChapterTitleText>{selectedChapter?.title}</ChapterTitleText>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <HeaderStats>
                        <Stat><span>Likes</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{chapterStats.likes}</AnimateNumber></strong></Stat>
                        <Stat><span>Dislikes</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{chapterStats.dislikes}</AnimateNumber></strong></Stat>
                        <Stat><span>Comments</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{chapterStats.comments}</AnimateNumber></strong></Stat>
                        <Stat><span>Edits</span><strong><AnimateNumber transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>{chapterStats.edits}</AnimateNumber></strong></Stat>
                      </HeaderStats>
                    </div>
                  </ContentMeta>

                {selectedChapterId && currentCommitSha && (
                  <VersionTimeline
                    chapterId={selectedChapterId}
                    currentCommitSha={currentCommitSha}
                    onVersionChange={(sha) => {
                      fetchChapterContent(selectedChapterId, sha);
                    }}
                  />
                )}
                </ContentHeader>

                <ScrollableContent>
                  {shouldShowLoadingState ? (
                    <LoadingText>Loading chapter...</LoadingText>
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <ContentTransition
                        key={activeContentKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        {activeView === 'likes' && (
                          <LikesHeatmapView
                            chapterHtml={chapterHtml}
                            heatmapLines={heatmapLines}
                            ranges={heatmapRanges}
                          />
                        )}
                        {activeView === 'comments' && (
                          <CommentsView
                            chapterHtml={chapterHtml}
                            comments={dashComments}
                            suggestions={dashSuggestions}
                            chapterId={contentChapterId ?? ''}
                            chapterVersionId={chapterVersionId ?? ''}
                            onDelete={handleDeleteFeedback}
                          />
                        )}
                        {activeView === 'retention' && (
                          <RetentionView data={retentionData} signups={interestSignups} chapterHtml={chapterHtml} />
                        )}
                      </ContentTransition>
                    </AnimatePresence>
                  )}
                </ScrollableContent>
              </>
            )}
          </ContentArea>

          <Sidebar
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SidebarHeader>
              <SidebarTitle>Chapters</SidebarTitle>
            </SidebarHeader>
            <ChapterList>
              {visibleChapters.map(chapter => (
                <ChapterItem
                  key={chapter.id}
                  $active={chapter.id === selectedChapterId}
                  onClick={() => setSelectedChapterId(chapter.id)}
                  role="button"
                  tabIndex={0}
                  aria-current={chapter.id === selectedChapterId ? 'true' : undefined}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedChapterId(chapter.id);
                    }
                  }}
                >
                  <ChapterItemTitle $active={chapter.id === selectedChapterId}>
                    {chapter.title}
                  </ChapterItemTitle>
                </ChapterItem>
              ))}
            </ChapterList>
          </Sidebar>
        </Panel>
      </Shell>

      <TabBar aria-label="Dashboard sections">
        {VIEWS.map(v => (
          <TabBarButton
            key={v.key}
            type="button"
            $active={v.key === activeView}
            aria-current={v.key === activeView ? 'page' : undefined}
            onClick={() => selectView(v.key)}
          >
            <TabIcon view={v.key} />
            <span>{v.shortLabel}</span>
          </TabBarButton>
        ))}
      </TabBar>
    </Desktop>
    {needsLogin && (
      <LoginOverlay>
        <LoginCard key={shakeKey} onSubmit={handleLogin} $shake={shakeKey > 0}>
          <LoginInput
            type="password"
            name="password"
            autoComplete="current-password"
            aria-label="Password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            autoFocus
          />
          <LoginButton type="submit">Enter</LoginButton>
        </LoginCard>
      </LoginOverlay>
    )}
    </MotionConfig>
  );
}
