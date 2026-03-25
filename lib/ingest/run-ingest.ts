import sql, { rawQuery } from '../db/client';
import { CREATE_SCHEMA_SQL } from '../db/schema';
import { loadAllMarkdownChapters } from '../content/load-markdown';
import { parseChapter } from './parse-chapter';
import { diffChapterVersions } from './diff-chapter';
import { htmlToWords, buildWordMap } from '../db/wordPos';
import simpleGit from 'simple-git';

export interface IngestResult {
  workId: string;
  documentVersionId: string;
  chaptersIngested: number;
  alreadyExists: boolean;
}

async function getCurrentCommitInfo(): Promise<{
  sha: string;
  message: string;
  author: string;
  createdAt: string;
}> {
  // Explicit env vars take priority (set manually or via CI/CD)
  const sha =
    process.env.GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||   // set automatically by Vercel at runtime
    null;

  if (sha) {
    return {
      sha,
      message: process.env.GIT_COMMIT_MESSAGE || process.env.VERCEL_GIT_COMMIT_MESSAGE || '',
      author:
        process.env.GIT_COMMIT_AUTHOR ||
        process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN ||
        '',
      createdAt: process.env.GIT_COMMIT_CREATED_AT || new Date().toISOString(),
    };
  }

  // Fall back to local git CLI (works in dev, not available on Vercel serverless)
  const git = simpleGit(process.cwd());
  const log = await git.log({ maxCount: 1 });
  const latest = log.latest;
  if (!latest) throw new Error('No git commits found and no GIT_COMMIT_SHA env var set');
  return {
    sha: latest.hash,
    message: latest.message,
    author: latest.author_name,
    createdAt: latest.date,
  };
}

async function getPreviousCommitSha(currentSha: string): Promise<string | null> {
  const git = simpleGit(process.cwd());
  try {
    const log = await git.log({ maxCount: 2 });
    const commits = log.all;
    const currentIdx = commits.findIndex(c => c.hash === currentSha);
    if (currentIdx >= 0 && currentIdx + 1 < commits.length) {
      return commits[currentIdx + 1].hash;
    }
    return null;
  } catch {
    return null;
  }
}

export async function runIngest(): Promise<IngestResult> {
  const workSlug = process.env.BOOK_SLUG || 'default';
  const workTitle = process.env.BOOK_TITLE || 'My Book';

  // Fast path: check if already ingested BEFORE running schema DDL
  const commitInfo = await getCurrentCommitInfo();
  try {
    const [work] = await sql`SELECT id FROM works WHERE slug = ${workSlug}`;
    if (work) {
      const existing = await sql`
        SELECT id FROM document_versions
        WHERE work_id = ${work.id} AND commit_sha = ${commitInfo.sha}
      `;
      if (existing.length > 0) {
        return {
          workId: work.id as string,
          documentVersionId: existing[0].id as string,
          chaptersIngested: 0,
          alreadyExists: true,
        };
      }

      // Check if this commit touches chapters/ — skip if not
      try {
        const git = simpleGit(process.cwd());
        const prevSha = await getPreviousCommitSha(commitInfo.sha);
        if (prevSha) {
          const diff = await git.diff(['--name-only', prevSha, commitInfo.sha, '--', 'chapters/']);
          if (!diff.trim()) {
            console.log(`[ingest] skip ${commitInfo.sha.slice(0, 8)} — no changes in chapters/`);
            const [latest] = await sql`
              SELECT id FROM document_versions WHERE work_id = ${work.id} ORDER BY deployed_at DESC LIMIT 1
            `;
            return {
              workId: work.id as string,
              documentVersionId: latest?.id as string ?? '',
              chaptersIngested: 0,
              alreadyExists: true,
            };
          }
        }
      } catch { /* git not available, fall through */ }
    }
  } catch {
    // Schema doesn't exist yet — fall through to DDL
  }

  // Ensure schema exists (only runs if fast path didn't return)
  const statements = CREATE_SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await rawQuery(stmt);
  }

  // Upsert work
  const [work] = await sql`
    INSERT INTO works (slug, title)
    VALUES (${workSlug}, ${workTitle})
    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
    RETURNING id
  `;
  const workId = work.id as string;

  // Create document version
  const [docVersion] = await sql`
    INSERT INTO document_versions (work_id, commit_sha, commit_message, commit_author, commit_created_at)
    VALUES (${workId}, ${commitInfo.sha}, ${commitInfo.message}, ${commitInfo.author}, ${commitInfo.createdAt})
    ON CONFLICT (work_id, commit_sha) DO UPDATE SET deployed_at = now()
    RETURNING id
  `;
  const documentVersionId = docVersion.id as string;

  // Load and parse all chapters
  const markdownChapters = loadAllMarkdownChapters();
  let chaptersIngested = 0;

  // Get previous document version for diffing
  const prevSha = await getPreviousCommitSha(commitInfo.sha);

  for (const rawChapter of markdownChapters) {
    const parsed = parseChapter(rawChapter);

    // Upsert chapter
    const [chapter] = await sql`
      INSERT INTO chapters (work_id, slug, title, file_path, sort_order)
      VALUES (${workId}, ${parsed.slug}, ${parsed.title}, ${parsed.filePath}, ${parsed.sortOrder})
      ON CONFLICT (work_id, file_path) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        sort_order = EXCLUDED.sort_order
      RETURNING id
    `;
    const chapterId = chapter.id as string;

    // Get version number (count existing versions for this chapter + 1)
    const [versionCount] = await sql`
      SELECT COUNT(*) as cnt FROM chapter_versions WHERE chapter_id = ${chapterId}
    `;
    const versionNumber = (parseInt(versionCount.cnt as string, 10)) + 1;

    // Create chapter version
    const [chapterVersion] = await sql`
      INSERT INTO chapter_versions (
        chapter_id, document_version_id, version_number, title,
        raw_markdown, rendered_html, line_count, word_count, char_count
      ) VALUES (
        ${chapterId}, ${documentVersionId}, ${versionNumber}, ${parsed.title},
        ${parsed.rawMarkdown}, ${parsed.renderedHtml},
        ${parsed.lineCount}, ${parsed.wordCount}, ${parsed.charCount}
      )
      ON CONFLICT (chapter_id, document_version_id) DO UPDATE SET
        title = EXCLUDED.title,
        raw_markdown = EXCLUDED.raw_markdown,
        rendered_html = EXCLUDED.rendered_html,
        line_count = EXCLUDED.line_count,
        word_count = EXCLUDED.word_count,
        char_count = EXCLUDED.char_count
      RETURNING id
    `;
    const chapterVersionId = chapterVersion.id as string;

    // Insert lines in a single batch (delete existing first for idempotency)
    await sql`DELETE FROM chapter_version_lines WHERE chapter_version_id = ${chapterVersionId}`;
    if (parsed.lines.length > 0) {
      const versionIds = parsed.lines.map(() => chapterVersionId);
      const lineNumbers = parsed.lines.map(l => l.lineNumber);
      const lineTexts = parsed.lines.map(l => l.lineText);
      const lineHashes = parsed.lines.map(l => l.lineHash);
      const blockTypes = parsed.lines.map(l => l.blockType);
      await sql`
        INSERT INTO chapter_version_lines (chapter_version_id, line_number, line_text, line_hash, block_type)
        SELECT * FROM unnest(
          ${versionIds}::uuid[],
          ${lineNumbers}::int[],
          ${lineTexts}::text[],
          ${lineHashes}::text[],
          ${blockTypes}::text[]
        )
      `;
    }

    // Compute and store diff + word map
    if (prevSha) {
      const diffResult = await diffChapterVersions(parsed.filePath, prevSha, commitInfo.sha);

      // Find previous chapter version
      const prevChapterVersions = await sql`
        SELECT cv.id, cv.rendered_html FROM chapter_versions cv
        JOIN document_versions dv ON dv.id = cv.document_version_id
        WHERE cv.chapter_id = ${chapterId} AND dv.commit_sha = ${prevSha}
      `;
      const prevChapterVersion = prevChapterVersions[0] ?? null;
      const prevChapterVersionId = prevChapterVersion?.id as string | null;

      // Word-level alignment map (new index → old index, -1 if new)
      const newWords = htmlToWords(parsed.renderedHtml);
      const wordMap = prevChapterVersion
        ? buildWordMap(htmlToWords(prevChapterVersion.rendered_html as string), newWords)
        : null;

      await sql`
        INSERT INTO chapter_diffs (
          chapter_version_id, previous_chapter_version_id,
          added_lines, removed_lines, changed_lines, diff_json, word_map
        ) VALUES (
          ${chapterVersionId}, ${prevChapterVersionId ?? null},
          ${diffResult.addedLines}, ${diffResult.removedLines}, ${diffResult.changedLines},
          ${JSON.stringify(diffResult.diffJson)}, ${wordMap}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    chaptersIngested++;
  }

  return { workId, documentVersionId, chaptersIngested, alreadyExists: false };
}

// Singleton: one ingest per server process (each Vercel deploy = new process)
let ingestPromise: Promise<IngestResult> | null = null;

export async function ensureIngested(): Promise<IngestResult> {
  if (!ingestPromise) {
    ingestPromise = runIngest().catch(err => {
      ingestPromise = null; // allow retry on error
      throw err;
    });
  }
  return ingestPromise;
}

/** Force a fresh ingest regardless of singleton state (used by /api/ingest endpoint). */
export async function forceIngest(): Promise<IngestResult> {
  ingestPromise = null;
  return ensureIngested();
}
