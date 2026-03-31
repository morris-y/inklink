import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: chapterVersionId } = await params;

  const totalReaders = await sql`
    SELECT COUNT(*) as cnt FROM chapter_reads WHERE chapter_version_id = ${chapterVersionId}
  `;
  const completions = await sql`
    SELECT COUNT(*) as cnt FROM chapter_reads WHERE chapter_version_id = ${chapterVersionId} AND completed_at IS NOT NULL
  `;
  const avgSeconds = await sql`
    SELECT AVG(active_seconds)::int as avg_seconds FROM chapter_reads WHERE chapter_version_id = ${chapterVersionId}
  `;

  // Drop-off curve: for each line, how many readers reached it
  const lineReach = await sql`
    SELECT max_line_seen, COUNT(*) as reader_count
    FROM chapter_reads
    WHERE chapter_version_id = ${chapterVersionId}
    GROUP BY max_line_seen
    ORDER BY max_line_seen
  `;

  // Count paragraph-level elements from rendered HTML to match reader-side counting
  // (line_count in DB counts raw markdown lines including blanks, which is ~2x too high)
  const htmlRow = await sql`
    SELECT rendered_html FROM chapter_versions WHERE id = ${chapterVersionId}
  `;
  const html = (htmlRow[0]?.rendered_html as string) || '';
  const lineCount = (html.match(/<(p|blockquote|h[1-6]|li)[\s>]/gi) || []).length;

  // Next-chapter continuation: what % of readers moved on to the next chapter?
  const nextChapterReaders = await sql`
    WITH this_chapter AS (
      SELECT c.id as chapter_id, c.sort_order, c.work_id
      FROM chapter_versions cv
      JOIN chapters c ON c.id = cv.chapter_id
      WHERE cv.id = ${chapterVersionId}
    ),
    next_chapter_versions AS (
      SELECT cv.id as version_id
      FROM chapters c
      JOIN this_chapter tc ON c.work_id = tc.work_id AND c.sort_order > tc.sort_order
      JOIN chapter_versions cv ON cv.chapter_id = c.id
      ORDER BY c.sort_order
    ),
    this_readers AS (
      SELECT DISTINCT reader_session_id
      FROM chapter_reads
      WHERE chapter_version_id = ${chapterVersionId}
    )
    SELECT COUNT(DISTINCT cr.reader_session_id) as cnt
    FROM chapter_reads cr
    JOIN next_chapter_versions ncv ON cr.chapter_version_id = ncv.version_id
    JOIN this_readers tr ON cr.reader_session_id = tr.reader_session_id
  `;
  const continuedCount = parseInt(nextChapterReaders[0]?.cnt as string, 10) || 0;
  const totalReadersCount = parseInt(totalReaders[0].cnt as string, 10);
  const continuationRate = totalReadersCount > 0
    ? Math.round((continuedCount / totalReadersCount) * 100)
    : 0;

  // Build cumulative reach curve
  const readersByLine: Record<number, number> = {};
  let cumulative = parseInt(totalReaders[0].cnt as string, 10);
  for (let i = 1; i <= lineCount; i++) {
    const stopped = lineReach.find(r => (r.max_line_seen as number) === i - 1);
    if (stopped) cumulative -= parseInt(stopped.reader_count as string, 10);
    readersByLine[i] = cumulative;
  }

  const dropOffCurve = Object.entries(readersByLine).map(([line, count]) => ({
    lineNumber: parseInt(line, 10),
    readersReached: count,
    reachPercent: parseInt(totalReaders[0].cnt as string, 10) > 0
      ? Math.round((count / parseInt(totalReaders[0].cnt as string, 10)) * 100)
      : 0,
  }));

  return NextResponse.json({
    totalReaders: totalReadersCount,
    completions: parseInt(completions[0].cnt as string, 10),
    completionRate: totalReadersCount > 0
      ? Math.round((parseInt(completions[0].cnt as string, 10) / totalReadersCount) * 100)
      : 0,
    avgActiveSeconds: avgSeconds[0]?.avg_seconds || 0,
    continuedToNext: continuedCount,
    continuationRate,
    dropOffCurve,
  });
}
