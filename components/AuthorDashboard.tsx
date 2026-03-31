'use client';

import { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimateNumber } from 'motion-plus/react';
import { Chapter } from '@/types';
import LikesHeatmapView, { HeatmapRange } from './LikesHeatmapView';
import CommentsView from './CommentsView';
import VersionTimeline from './VersionTimeline';
import RetentionView, { RetentionData, InterestSignup } from './RetentionView';

const SURFACE_BASE = '#fcfcfc';
const SURFACE_TEXTURE = css`
  background-color: ${SURFACE_BASE};
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 100px 100px;
`;
const INACTIVE_TAB_SURFACES = ['#d0ccc4', '#b5b2ad', '#9a9997'];

/* ─── Desktop ────────────────────────────────────────────────────────────── */

const Desktop = styled.div`
  min-height: 100vh;
  padding: 3% 10% 10% 10%;
  background-color: #302f2f;
  display: flex;
  flex-direction: column;
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

/* ─── Content area ────────────────────────────────────────────────────────── */

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ContentHeader = styled.div`
  padding: 1.75rem 2.5rem 0;

  display: flex;
  flex-direction: column;
  gap: 0;
`;

const ContentMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
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

/* ─── Pre-compute indicator ───────────────────────────────────────────────── */

const PreComputeIndicator = styled.div<{ $status: 'computing' | 'complete' | 'error' }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: ${p => p.$status === 'error' ? 'rgba(180,40,40,0.9)' : 'rgba(26,26,24,0.88)'};
  color: #f2ede4;
  padding: 0.6rem 1rem;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(26,26,24,0.15);
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.8rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

/* ─── Login overlay ───────────────────────────────────────────────────────── */

const LoginOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20,18,16,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
`;

const LoginCard = styled.div`
  background: #fcfcfc;
  border-radius: 8px;
  padding: 2.5rem 2.5rem 2rem;
  width: 320px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const LoginTitle = styled.h2`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.3rem;
  font-weight: 400;
  font-style: italic;
  color: #1a1a18;
  margin: 0 0 0.25rem;
`;

const LoginInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(26,26,24,0.18);
  border-radius: 4px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: rgba(26,26,24,0.45); }
`;

const LoginButton = styled.button`
  padding: 0.6rem 1rem;
  background: #1a1a18;
  color: #f2ede4;
  border: none;
  border-radius: 4px;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover { background: #3a3a36; }
`;

const LoginError = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.78rem;
  color: #b94a36;
  margin: 0;
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

  optgroup {
    font-weight: 600;
    font-size: 0.68rem;
    color: rgba(26,26,24,0.4);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`;

type ViewType = 'likes' | 'comments' | 'retention';

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


export default function AuthorDashboard() {
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterVersionId, setChapterVersionId] = useState<string | null>(null);
  const [chapterHtml, setChapterHtml] = useState<string>('');
  const [contentChapterId, setContentChapterId] = useState<string | null>(null);
  const [displayedCommitSha, setDisplayedCommitSha] = useState<string>('');
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('likes');
  const [currentCommitSha, setCurrentCommitSha] = useState<string>('');
  const [preComputeStatus, setPreComputeStatus] = useState<'idle' | 'computing' | 'complete' | 'error'>('idle');
  const [, setPreComputeProgress] = useState(0);
  const [heatmapLines, setHeatmapLines] = useState<HeatmapLine[]>([]);
  const [heatmapRanges, setHeatmapRanges] = useState<HeatmapRange[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalDislikes, setTotalDislikes] = useState(0);
  const [dashComments, setDashComments] = useState<DashComment[]>([]);
  const [dashSuggestions, setDashSuggestions] = useState<DashSuggestion[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [interestSignups, setInterestSignups] = useState<InterestSignup[]>([]);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [readers, setReaders] = useState<{ id: string; display_name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [chapterIdsAtCommit, setChapterIdsAtCommit] = useState<string[] | null>(null);

  useEffect(() => {
    fetchChapters();
    fetchReadersAndGroups();
    fetchInterestSignups();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedChapterId) {
      setDisplayedCommitSha('');
      setTotalLikes(0);
      setTotalDislikes(0);
      fetchChapterContent(selectedChapterId);
      startPreComputation(selectedChapterId);
    }
  }, [selectedChapterId]);

  useEffect(() => {
    if (chapterVersionId) {
      fetchHeatmap(chapterVersionId, filterValue);
      fetchChapterFeedback(chapterVersionId, filterValue);
    }
  }, [filterValue]);


  const startPreComputation = async (chapterId: string) => {
    try {
      const statusResponse = await fetch(`/api/chapters/${chapterId}/precompute`);
      const statusData = await statusResponse.json();
      if (statusData.status === 'complete') { setPreComputeStatus('complete'); return; }

      setPreComputeStatus('computing');
      setPreComputeProgress(0);

      const response = await fetch(`/api/chapters/${chapterId}/precompute`, { method: 'POST' });
      if (response.ok) {
        setPreComputeStatus('complete');
        setPreComputeProgress(100);
      } else {
        setPreComputeStatus('error');
      }
    } catch (error) {
      console.error('Pre-computation error:', error);
      setPreComputeStatus('error');
    }
  };

  const buildFilterParams = (filter: string) => {
    if (!filter || filter === 'all') return '';
    const [type, id] = filter.split(':');
    if (type === 'reader') return `?readerProfileId=${id}`;
    if (type === 'group')  return `?readerGroupId=${id}`;
    return '';
  };

  const fetchHeatmap = async (versionId: string, filter = filterValue) => {
    try {
      console.log('[dashboard] fetching heatmap for versionId:', versionId);
      const res = await fetch(`/api/dashboard/chapter-versions/${versionId}/heatmap${buildFilterParams(filter)}`);
      if (res.status === 401) { setNeedsLogin(true); return; }
      if (res.ok) {
        const data = await res.json();
        console.log('[dashboard] heatmap lines:', data.heatmap?.length, 'totalReaders:', data.totalReaders, 'reactions:', data.debug?.reactionRows, 'comments:', data.debug?.commentRows);
        setHeatmapLines(data.heatmap || []);
        setHeatmapRanges(data.ranges || []);
        setTotalLikes(data.totalLikes ?? 0);
        setTotalDislikes(data.totalDislikes ?? 0);
      } else {
        console.error('[dashboard] heatmap fetch failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Error fetching heatmap:', err);
    }
  };

  const fetchChapterFeedback = async (versionId: string, filter = filterValue) => {
    try {
      const res = await fetch(`/api/dashboard/chapter-versions/${versionId}/feedback${buildFilterParams(filter)}`);
      if (res.status === 401) { setNeedsLogin(true); return; }
      if (res.ok) {
        const data = await res.json();
        setDashComments(data.comments || []);
        setDashSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };

  const fetchReadersAndGroups = async () => {
    try {
      const [rRes, gRes] = await Promise.all([
        fetch('/api/dashboard/readers'),
        fetch('/api/dashboard/groups'),
      ]);
      if (rRes.ok) { const d = await rRes.json(); setReaders(d.readers || []); }
      if (gRes.ok) { const d = await gRes.json(); setGroups(d.groups || []); }
    } catch { /* ignore */ }
  };

  const fetchRetention = async (versionId: string) => {
    try {
      const res = await fetch(`/api/dashboard/chapter-versions/${versionId}/retention`);
      if (res.status === 401) { setNeedsLogin(true); return; }
      if (res.ok) setRetentionData(await res.json());
    } catch { /* ignore */ }
  };

  const fetchInterestSignups = async () => {
    try {
      const res = await fetch('/api/dashboard/interest-signups');
      if (res.ok) {
        const data = await res.json();
        setInterestSignups(data.signups || []);
      }
    } catch { /* ignore */ }
  };

  const handleDeleteFeedback = async (id: string, type: 'comment' | 'suggestion') => {
    try {
      const res = await fetch(`/api/dashboard/feedback/${id}?type=${type}`, { method: 'DELETE' });
      if (res.ok) {
        if (type === 'comment') {
          setDashComments(prev => prev.filter(c => c.id !== id));
        } else {
          setDashSuggestions(prev => prev.filter(s => s.id !== id));
        }
      }
    } catch (err) {
      console.error('Delete feedback error:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/dashboard/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword }),
    });
    if (res.ok) {
      setNeedsLogin(false);
      setLoginPassword('');
      if (chapterVersionId) {
        fetchHeatmap(chapterVersionId, filterValue);
        fetchChapterFeedback(chapterVersionId, filterValue);
        fetchReadersAndGroups();
      }
    } else {
      setLoginError('Incorrect password');
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      const data = await response.json();
      setChapters(data.chapters || []);
      if (data.chapters && data.chapters.length > 0) {
        setSelectedChapterId(data.chapters[0].id);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
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

      setChapterHtml(data.html || '');
      setContentChapterId(chapterId);
      setDisplayedCommitSha(nextCommitSha);
      console.log('[dashboard] chapter response keys:', Object.keys(data), 'versionId:', data.versionId);
      if (data.versionId) {
        setChapterVersionId(data.versionId);
        fetchHeatmap(data.versionId, filterValue);
        fetchChapterFeedback(data.versionId, filterValue);
        fetchRetention(data.versionId);
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
  // Key on view tab only — chapter and version changes update props without remounting
  const activeContentKey = activeView;
  const shouldShowLoadingState = loadingChapter && contentChapterId !== selectedChapterId;

  return (
    <Desktop>
      <Shell>
        {/* Tab row sits at the top of the shell */}
        <TabRow>
          {(() => {
            const tabs: { key: ViewType; label: string; w: number; mask: string }[] = [
              { key: 'likes', label: 'Heatmap', w: CORNER_TAB_W, mask: '/corner_tab.svg' },
              { key: 'comments', label: 'Comments & Edits', w: FOLDER_TAB_W, mask: '/folder_tab.svg' },
              { key: 'retention', label: 'Retention', w: FOLDER_TAB_W, mask: '/folder_tab.svg' },
            ];
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
                <InactiveTab key={tab.key} $dist={dist} style={{ marginLeft: ml }} onClick={() => setActiveView(tab.key)}>{tab.label}</InactiveTab>
              );
            });
          })()}

          {(readers.length > 0 || groups.length > 0) && (
            <FilterArea>
              <FilterSelect
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
              >
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
              {chapters.filter(ch => !chapterIdsAtCommit || chapterIdsAtCommit.includes(ch.id)).map(chapter => (
                <ChapterItem
                  key={chapter.id}
                  $active={chapter.id === selectedChapterId}
                  onClick={() => setSelectedChapterId(chapter.id)}
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

      {preComputeStatus !== 'idle' && preComputeStatus !== 'complete' && (
        <PreComputeIndicator $status={preComputeStatus}>
          {preComputeStatus === 'computing' && 'Pre-computing versions...'}
          {preComputeStatus === 'error' && 'Pre-computation failed'}
        </PreComputeIndicator>
      )}

      {needsLogin && (
        <LoginOverlay>
          <LoginCard>
            <LoginTitle>Dashboard Login</LoginTitle>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <LoginInput
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                autoFocus
              />
              {loginError && <LoginError>{loginError}</LoginError>}
              <LoginButton type="submit">Sign in</LoginButton>
            </form>
          </LoginCard>
        </LoginOverlay>
      )}
    </Desktop>
  );
}
