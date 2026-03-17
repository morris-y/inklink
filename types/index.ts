// ---------------------------------------------------------------------------
// Legacy types — kept for compatibility with existing components.
// New code should use the types below.
// ---------------------------------------------------------------------------

export interface WordToken {
  wordId: string;
  text: string;
  lineNumber: number;
  positionInLine: number;
  charStart: number;
  charEnd: number;
}

export interface Feedback {
  id: number;
  readerId: string;
  chapterId: number;
  wordId?: string;
  snippetText: string;
  snippetStart: number;
  snippetEnd: number;
  feedbackType: 'like' | 'dislike' | 'comment' | 'edit';
  comment?: string;
  suggestedEdit?: string;
  createdAtCommit?: string;
  abTestId?: number;
  abTestVersion?: 'A' | 'B';
  createdAt: string;
}

export interface GitVersion {
  commitSha: string;
  commitShortSha: string;
  authorName: string;
  authorEmail: string;
  date: Date;
  message: string;
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  author: string;
  date: Date;
  message: string;
}

// ---------------------------------------------------------------------------
// Works
export interface Work {
  id: string;
  slug: string;
  title: string;
  description?: string;
  createdAt: string;
}

// Chapters
export interface Chapter {
  id: string;
  workId: string;
  slug: string;
  title: string;
  filePath: string;
  sortOrder: number;
  createdAt: string;
}

// Document versions
export interface DocumentVersion {
  id: string;
  workId: string;
  commitSha: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitCreatedAt?: string;
  deployedAt: string;
  isActive: boolean;
}

// Chapter versions
export interface ChapterVersion {
  id: string;
  chapterId: string;
  documentVersionId: string;
  versionNumber: number;
  title: string;
  rawMarkdown: string;
  renderedHtml: string;
  lineCount: number;
  wordCount: number;
  charCount: number;
  createdAt: string;
}

// Lines
export interface ChapterVersionLine {
  id: string;
  chapterVersionId: string;
  lineNumber: number;
  lineText: string;
  lineHash: string;
  blockType?: string;
}

// Reader profiles
export interface ReaderProfile {
  id: string;
  workId: string;
  slug: string;
  displayName: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

// Reader groups
export interface ReaderGroup {
  id: string;
  workId: string;
  slug: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Reader invites
export interface ReaderInvite {
  id: string;
  workId: string;
  token: string;
  readerProfileId?: string;
  readerGroupId?: string;
  label?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

// Reader sessions
export interface ReaderSession {
  id: string;
  workId: string;
  anonymousId: string;
  readerProfileId?: string;
  readerGroupId?: string;
  readerInviteId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

// Chapter reads
export interface ChapterRead {
  id: string;
  readerSessionId: string;
  chapterVersionId: string;
  startedAt: string;
  lastActiveAt: string;
  completedAt?: string;
  maxLineSeen: number;
  maxScrollPercent: number;
  activeSeconds: number;
  completionPercent: number;
}

// Feedback
export interface FeedbackReaction {
  id: string;
  readerSessionId: string;
  chapterVersionId: string;
  readerProfileId?: string;
  readerGroupId?: string;
  readerInviteId?: string;
  startLine: number;
  endLine: number;
  reaction: 'like' | 'dislike';
  createdAt: string;
}

export interface FeedbackComment {
  id: string;
  readerSessionId: string;
  chapterVersionId: string;
  readerProfileId?: string;
  readerGroupId?: string;
  readerInviteId?: string;
  startLine: number;
  endLine: number;
  body: string;
  createdAt: string;
}

export interface SuggestedEdit {
  id: string;
  readerSessionId: string;
  chapterVersionId: string;
  readerProfileId?: string;
  readerGroupId?: string;
  readerInviteId?: string;
  startLine: number;
  endLine: number;
  originalText: string;
  suggestedText: string;
  rationale?: string;
  createdAt: string;
}

export interface InterestSignup {
  id: string;
  workId: string;
  readerSessionId?: string;
  email: string;
  source?: string;
  createdAt: string;
}

// Heatmap
export interface HeatmapLine {
  lineNumber: number;
  lineText: string;
  likeCount: number;
  dislikeCount: number;
  netScore: number;
  commentCount: number;
  suggestionCount: number;
  readerReachPercent: number;
}
