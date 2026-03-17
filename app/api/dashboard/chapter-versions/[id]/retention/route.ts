import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isDashboardAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const totalLineCount = await sql`
    SELECT line_count FROM chapter_versions WHERE id = ${chapterVersionId}
  `;
  const lineCount = totalLineCount[0]?.line_count as number || 0;

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
    totalReaders: parseInt(totalReaders[0].cnt as string, 10),
    completions: parseInt(completions[0].cnt as string, 10),
    completionRate: parseInt(totalReaders[0].cnt as string, 10) > 0
      ? Math.round((parseInt(completions[0].cnt as string, 10) / parseInt(totalReaders[0].cnt as string, 10)) * 100)
      : 0,
    avgActiveSeconds: avgSeconds[0]?.avg_seconds || 0,
    dropOffCurve,
  });
}
