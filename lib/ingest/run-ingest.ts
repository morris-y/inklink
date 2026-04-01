import sql, { rawQuery } from '../db/client';
import { CREATE_SCHEMA_SQL } from '../db/schema';
import { loadAllMarkdownChapters } from '../content/load-markdown';
import { parseChapter } from './parse-chapter';
import { htmlToWords, buildWordMap } from '../db/wordPos';
import { getWorkSlug } from '@/lib/slug';
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

export async function runIngest(): Promise<IngestResult> {
  const workSlug = getWorkSlug();
  const workTitle = process.env.TITLE || 'My Book';

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

  // Load and parse all chapters
  const markdownChapters = loadAllMarkdownChapters();

  // No chapter files on disk → nothing to ingest
  if (markdownChapters.length === 0) {
    console.log(`[ingest] skip ${commitInfo.sha.slice(0, 8)} — no chapter files found`);
    const [latest] = await sql`
      SELECT id FROM document_versions WHERE work_id = ${workId} ORDER BY deployed_at DESC LIMIT 1
    `;
    return {
      workId,
      documentVersionId: latest?.id as string ?? '',
      chaptersIngested: 0,
      alreadyExists: true,
    };
  }

  // Compare against latest stored versions BEFORE creating document_version —
  // skip entirely if nothing in chapters/ changed (avoids creating DB rows for
  // commits that don't touch chapter content).
  const latestVersions = await sql`
    SELECT cv.raw_markdown, c.file_path
    FROM chapter_versions cv
    JOIN chapters c ON c.id = cv.chapter_id
    JOIN document_versions dv ON dv.id = cv.document_version_id
    WHERE c.work_id = ${workId}
      AND dv.id = (SELECT id FROM document_versions WHERE work_id = ${workId} ORDER BY deployed_at DESC LIMIT 1)
  `;
  const prevByFile = new Map(latestVersions.map(r => [r.file_path as string, r.raw_markdown as string]));
  const chaptersChanged = markdownChapters.length !== prevByFile.size
    || markdownChapters.some(ch => prevByFile.get(ch.filePath) !== ch.rawMarkdown);

  if (!chaptersChanged) {
    console.log(`[ingest] skip ${commitInfo.sha.slice(0, 8)} — chapter content unchanged`);
    const [latest] = await sql`
      SELECT id FROM document_versions WHERE work_id = ${workId} ORDER BY deployed_at DESC LIMIT 1
    `;
    return {
      workId,
      documentVersionId: latest?.id as string ?? '',
      chaptersIngested: 0,
      alreadyExists: true,
    };
  }

  // Create document version (only when chapter content has actually changed)
  const [docVersion] = await sql`
    INSERT INTO document_versions (work_id, commit_sha, commit_message, commit_author, commit_created_at)
    VALUES (${workId}, ${commitInfo.sha}, ${commitInfo.message}, ${commitInfo.author}, ${commitInfo.createdAt})
    ON CONFLICT (work_id, commit_sha) DO UPDATE SET deployed_at = now()
    RETURNING id
  `;
  const documentVersionId = docVersion.id as string;

  let chaptersIngested = 0;

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

    // Compute word map from DB (no git needed) for cross-version feedback tracking
    const prevChapterVersions = await sql`
      SELECT cv.id, cv.rendered_html FROM chapter_versions cv
      WHERE cv.chapter_id = ${chapterId} AND cv.id != ${chapterVersionId}
      ORDER BY cv.version_number DESC LIMIT 1
    `;
    const prevChapterVersion = prevChapterVersions[0] ?? null;

    if (prevChapterVersion) {
      const prevChapterVersionId = prevChapterVersion.id as string;
      const newWords = htmlToWords(parsed.renderedHtml);
      const wordMap = buildWordMap(
        htmlToWords(prevChapterVersion.rendered_html as string),
        newWords,
      );

      await sql`
        INSERT INTO chapter_diffs (
          chapter_version_id, previous_chapter_version_id, word_map
        ) VALUES (
          ${chapterVersionId}, ${prevChapterVersionId}, ${wordMap}
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
