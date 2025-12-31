import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import { LRUCache } from 'lru-cache';
import { GitVersion, CommitInfo } from '@/types';
import { GitNotAvailableError, GitFileNotFoundError } from './error-handling';

// Initialize git with repository root
const git: SimpleGit = simpleGit(process.cwd());

// Cache configuration
const GIT_LOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const FILE_CONTENT_CACHE_TTL = 0; // Indefinite (immutable)

// LRU caches
const gitLogCache = new LRUCache<string, LogResult>({
  max: 100, // Max 100 different files
  ttl: GIT_LOG_CACHE_TTL
});

const fileContentCache = new LRUCache<string, string>({
  max: 500, // Max 500 file versions
  ttl: FILE_CONTENT_CACHE_TTL
});

/**
 * Get all commits that modified a specific file
 * Includes tracking through file renames
 *
 * @param filename Path to file relative to repo root (or just filename, will prepend chapters/)
 * @returns Array of git versions sorted by date (newest first)
 */
export async function getChapterVersions(filename: string): Promise<GitVersion[]> {
  try {
    // Prepend chapters/ if not already present
    const fullPath = filename.startsWith('chapters/') ? filename : `chapters/${filename}`;

    // Check cache first
    const cacheKey = `log:${fullPath}`;
    let logResult = gitLogCache.get(cacheKey);

    if (!logResult) {
      // Fetch from git
      logResult = await git.log({
        file: fullPath,
        '--follow': null // Track through renames
      });
      gitLogCache.set(cacheKey, logResult);
    }

    // Convert to GitVersion format
    return logResult.all.map(commit => ({
      commitSha: commit.hash,
      commitShortSha: commit.hash.substring(0, 7),
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: new Date(commit.date),
      message: commit.message
    }));
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('not a git repository') || message.includes('fatal:')) {
        throw new GitNotAvailableError('Git repository not initialized');
      }
    }
    console.error(`Error getting versions for ${filename}:`, error);
    // Return empty array for other errors (no commits yet, etc.)
    return [];
  }
}

/**
 * Get file content at a specific commit
 * Results are cached indefinitely (immutable)
 *
 * @param filename Path to file relative to repo root (or just filename, will prepend chapters/)
 * @param commitSha Git commit SHA
 * @returns File content as string
 */
export async function getFileContentAtCommit(
  filename: string,
  commitSha: string
): Promise<string> {
  try {
    // Prepend chapters/ if not already present
    const fullPath = filename.startsWith('chapters/') ? filename : `chapters/${filename}`;

    // Check cache first
    const cacheKey = `content:${fullPath}:${commitSha}`;
    let content = fileContentCache.get(cacheKey);

    if (content === undefined) {
      // Fetch from git
      content = await git.show([`${commitSha}:${fullPath}`]);
      fileContentCache.set(cacheKey, content);
    }

    return content;
  } catch (error) {
    console.error(`Error getting file content at ${commitSha}:`, error);
    throw new Error(`Failed to get file content: ${error}`);
  }
}

/**
 * Get the current HEAD commit SHA for a file
 * This is the commit that last modified the file
 *
 * @param filename Path to file relative to repo root
 * @returns Commit SHA of last modification
 */
export async function getCurrentCommitForFile(filename: string): Promise<string> {
  try {
    const versions = await getChapterVersions(filename);

    if (versions.length === 0) {
      throw new Error(`No commits found for ${filename}`);
    }

    // First version in list is the most recent
    return versions[0].commitSha;
  } catch (error) {
    console.error(`Error getting current commit for ${filename}:`, error);
    throw new Error(`Failed to get current commit: ${error}`);
  }
}

/**
 * Get metadata about a specific commit
 *
 * @param commitSha Git commit SHA
 * @returns Commit information
 */
export async function getCommitInfo(commitSha: string): Promise<CommitInfo> {
  try {
    const logResult = await git.log([commitSha, '-1']);

    if (logResult.all.length === 0) {
      throw new Error(`Commit ${commitSha} not found`);
    }

    const commit = logResult.all[0];

    return {
      sha: commit.hash,
      shortSha: commit.hash.substring(0, 7),
      author: commit.author_name,
      date: new Date(commit.date),
      message: commit.message
    };
  } catch (error) {
    console.error(`Error getting commit info for ${commitSha}:`, error);
    throw new Error(`Failed to get commit info: ${error}`);
  }
}

/**
 * Validate that a commit exists in the repository
 *
 * @param commitSha Git commit SHA
 * @returns True if commit exists
 */
export async function validateCommitExists(commitSha: string): Promise<boolean> {
  try {
    await getCommitInfo(commitSha);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get git diff between two commits for a specific file
 * Used for detecting which lines/words changed
 *
 * @param filename Path to file relative to repo root (or just filename, will prepend chapters/)
 * @param fromCommit Previous commit SHA (or null for initial commit)
 * @param toCommit New commit SHA
 * @returns Unified diff output as string
 */
export async function getFileDiff(
  filename: string,
  fromCommit: string | null,
  toCommit: string
): Promise<string> {
  try {
    // Prepend chapters/ if not already present
    const fullPath = filename.startsWith('chapters/') ? filename : `chapters/${filename}`;

    if (!fromCommit) {
      // For initial commit, show all content as additions
      const content = await getFileContentAtCommit(fullPath, toCommit);
      // Format as unified diff
      const lines = content.split('\n');
      const diffLines = [
        `@@ -0,0 +1,${lines.length} @@`,
        ...lines.map(line => `+${line}`)
      ];
      return diffLines.join('\n');
    }

    // Get diff between commits
    const diff = await git.diff([
      `${fromCommit}:${fullPath}`,
      `${toCommit}:${fullPath}`
    ]);

    return diff;
  } catch (error) {
    console.error(`Error getting diff for ${filename}:`, error);
    throw new Error(`Failed to get diff: ${error}`);
  }
}

/**
 * Check if git repository is initialized
 *
 * @returns True if .git directory exists and is valid
 */
export async function isGitInitialized(): Promise<boolean> {
  try {
    await git.status();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all git caches
 * Useful for testing or after manual git operations
 */
export function clearGitCaches(): void {
  gitLogCache.clear();
  fileContentCache.clear();
}
