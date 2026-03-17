import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isDashboardAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: chapterVersionId } = await params;
  const { searchParams } = new URL(req.url);
  const readerProfileId = searchParams.get('readerProfileId');
  const readerGroupId = searchParams.get('readerGroupId');
  const readerInviteId = searchParams.get('readerInviteId');

  // Get all lines for this chapter version
  const lines = await sql`
    SELECT line_number, line_text FROM chapter_version_lines
    WHERE chapter_version_id = ${chapterVersionId}
    ORDER BY line_number
  `;

  // Get reader reach: what % of readers reached each line
  const totalReaders = await sql`
    SELECT COUNT(DISTINCT reader_session_id) as cnt FROM chapter_reads
    WHERE chapter_version_id = ${chapterVersionId}
  `;
  const totalReaderCount = parseInt(totalReaders[0]?.cnt as string || '0', 10);

  // Get reactions per line
  const reactionsQuery = sql`
    SELECT start_line, end_line, reaction, COUNT(*) as cnt
    FROM feedback_reactions
    WHERE chapter_version_id = ${chapterVersionId}
    ${readerProfileId ? sql`AND reader_profile_id = ${readerProfileId}` : sql``}
    ${readerGroupId ? sql`AND reader_group_id = ${readerGroupId}` : sql``}
    ${readerInviteId ? sql`AND reader_invite_id = ${readerInviteId}` : sql``}
    GROUP BY start_line, end_line, reaction
  `;
  const reactions = await reactionsQuery;
  console.log(`[heatmap] chapterVersionId=${chapterVersionId} reactions=${reactions.length} lines=${lines.length}`);

  // Get comments per line
  const comments = await sql`
    SELECT start_line, end_line, COUNT(*) as cnt
    FROM feedback_comments
    WHERE chapter_version_id = ${chapterVersionId}
    ${readerProfileId ? sql`AND reader_profile_id = ${readerProfileId}` : sql``}
    ${readerGroupId ? sql`AND reader_group_id = ${readerGroupId}` : sql``}
    ${readerInviteId ? sql`AND reader_invite_id = ${readerInviteId}` : sql``}
    GROUP BY start_line, end_line
  `;

  // Get max line seen per reader for retention
  const retention = await sql`
    SELECT max_line_seen, COUNT(*) as reader_count
    FROM chapter_reads
    WHERE chapter_version_id = ${chapterVersionId}
    GROUP BY max_line_seen
  `;

  // Build per-line heatmap
  const retentionMap: Record<number, number> = {};
  for (const r of retention) {
    for (let i = 1; i <= Number(r.max_line_seen); i++) {
      retentionMap[i] = (retentionMap[i] || 0) + Number(r.reader_count);
    }
  }

  // Build reaction maps
  const likeMap: Record<number, number> = {};
  const dislikeMap: Record<number, number> = {};
  for (const r of reactions) {
    for (let i = Number(r.start_line); i <= Number(r.end_line); i++) {
      if (r.reaction === 'like') likeMap[i] = (likeMap[i] || 0) + Number(r.cnt);
      else dislikeMap[i] = (dislikeMap[i] || 0) + Number(r.cnt);
    }
  }

  const commentMap: Record<number, number> = {};
  for (const c of comments) {
    for (let i = Number(c.start_line); i <= Number(c.end_line); i++) {
      commentMap[i] = (commentMap[i] || 0) + Number(c.cnt);
    }
  }

  const heatmap = lines.map(line => {
    const ln = line.line_number as number;
    const readersReached = retentionMap[ln] || 0;
    return {
      lineNumber: ln,
      lineText: line.line_text,
      likeCount: likeMap[ln] || 0,
      dislikeCount: dislikeMap[ln] || 0,
      netScore: (likeMap[ln] || 0) - (dislikeMap[ln] || 0),
      commentCount: commentMap[ln] || 0,
      suggestionCount: 0,
      readerReachPercent: totalReaderCount > 0 ? Math.round((readersReached / totalReaderCount) * 100) : 0,
    };
  });

  return NextResponse.json({ chapterVersionId, heatmap, totalReaders: totalReaderCount, debug: { reactionRows: reactions.length, commentRows: comments.length } });
}
