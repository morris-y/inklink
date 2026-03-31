import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { wordRangeToCharPos } from '@/lib/db/wordPos';
import { resolveWordRange } from '@/lib/db/resolveWordRange';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: chapterVersionId } = await params;
  const { searchParams } = new URL(req.url);
  const readerProfileId = searchParams.get('readerProfileId');
  const readerGroupId = searchParams.get('readerGroupId');
  const readerInviteId = searchParams.get('readerInviteId');

  console.time('[heatmap] total');

  // ── Step 1: Get current version (need chapterId for subsequent queries) ──
  const [currentVer] = await sql`
    SELECT cv.id, cv.rendered_html, cv.word_count, c.id as chapter_id
    FROM chapter_versions cv
    JOIN chapters c ON c.id = cv.chapter_id
    WHERE cv.id = ${chapterVersionId}
  `;
  if (!currentVer) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  const chapterId = currentVer.chapter_id as string;
  const currentHtml = currentVer.rendered_html as string;
  const wordCount = Number(currentVer.word_count);

  // ── Step 2: Fetch version IDs + diffs in parallel (need IDs for reactions query)
  const [allVersions, diffs] = await Promise.all([
    sql`SELECT cv.id FROM chapter_versions cv WHERE cv.chapter_id = ${chapterId}`,
    sql`SELECT cd.chapter_version_id, cd.previous_chapter_version_id, cd.word_map
        FROM chapter_diffs cd
        JOIN chapter_versions cv ON cv.id = cd.chapter_version_id
        WHERE cv.chapter_id = ${chapterId}`,
  ]);
  const allVersionIds = allVersions.map(v => v.id as string);

  // ── Step 3: Fetch reactions + line data + retention + totals in parallel ──
  const [allReactions, lines, totalReadersResult, retention, reactionTotals] = await Promise.all([
    sql`SELECT fr.chapter_version_id, fr.word_start, fr.word_end, fr.reaction,
               rp.display_name as reader_name
        FROM feedback_reactions fr
        LEFT JOIN reader_profiles rp ON rp.id = fr.reader_profile_id
        WHERE fr.chapter_version_id = ${chapterVersionId}
          AND fr.word_start IS NOT NULL AND fr.word_end IS NOT NULL
          ${readerProfileId ? sql`AND fr.reader_profile_id = ${readerProfileId}` : sql``}
          ${readerGroupId ? sql`AND fr.reader_group_id = ${readerGroupId}` : sql``}
          ${readerInviteId ? sql`AND fr.reader_invite_id = ${readerInviteId}` : sql``}`,
    sql`SELECT line_number, line_text FROM chapter_version_lines
        WHERE chapter_version_id = ${chapterVersionId} ORDER BY line_number`,
    sql`SELECT COUNT(DISTINCT reader_session_id) as cnt FROM chapter_reads
        WHERE chapter_version_id = ${chapterVersionId}`,
    sql`SELECT max_line_seen, COUNT(*) as reader_count
        FROM chapter_reads WHERE chapter_version_id = ${chapterVersionId}
        GROUP BY max_line_seen`,
    sql`SELECT reaction, COUNT(*) as cnt
        FROM feedback_reactions
        WHERE chapter_version_id = ${chapterVersionId}
          AND word_start IS NOT NULL
          ${readerProfileId ? sql`AND reader_profile_id = ${readerProfileId}` : sql``}
          ${readerGroupId ? sql`AND reader_group_id = ${readerGroupId}` : sql``}
          ${readerInviteId ? sql`AND reader_invite_id = ${readerInviteId}` : sql``}
        GROUP BY reaction`,
  ]);

  // ── Resolve reactions to current version char positions ──────────────────
  console.time('[heatmap] resolve');

  interface RawRange {
    charStart: number;
    charLength: number;
    type: 'like' | 'dislike';
    readerName: string | null;
  }

  const rawRanges: RawRange[] = [];

  for (const r of allReactions) {
    const verId = r.chapter_version_id as string;
    const mapped = verId === chapterVersionId
      ? { wordStart: Number(r.word_start), wordEnd: Number(r.word_end) }
      : resolveWordRange(diffs as any[], verId, chapterVersionId, Number(r.word_start), Number(r.word_end));
    if (!mapped) continue;
    if (mapped.wordStart < 0 || mapped.wordEnd >= wordCount) continue;

    const cp = wordRangeToCharPos(currentHtml, mapped.wordStart, mapped.wordEnd);
    if (!cp) continue;

    rawRanges.push({
      charStart: cp.charStart,
      charLength: cp.charLength,
      type: r.reaction as 'like' | 'dislike',
      readerName: r.reader_name as string | null,
    });
  }
  console.timeEnd('[heatmap] resolve');

  // ── Group identical ranges ───────────────────────────────────────────────
  const grouped = new Map<string, { charStart: number; charLength: number; type: string; count: number; readerNames: string[] }>();
  for (const r of rawRanges) {
    const k = `${r.charStart}:${r.charLength}:${r.type}`;
    const existing = grouped.get(k);
    if (existing) {
      existing.count++;
      if (r.readerName && !existing.readerNames.includes(r.readerName)) {
        existing.readerNames.push(r.readerName);
      }
    } else {
      grouped.set(k, {
        charStart: r.charStart,
        charLength: r.charLength,
        type: r.type,
        count: 1,
        readerNames: r.readerName ? [r.readerName] : [],
      });
    }
  }

  const ranges = Array.from(grouped.values());

  // ── Build line-level heatmap + totals ────────────────────────────────────
  const totalReaderCount = parseInt(totalReadersResult[0]?.cnt as string || '0', 10);
  const retentionMap: Record<number, number> = {};
  for (const r of retention) {
    for (let i = 1; i <= Number(r.max_line_seen); i++) {
      retentionMap[i] = (retentionMap[i] || 0) + Number(r.reader_count);
    }
  }
  const heatmap = lines.map(line => ({
    lineNumber: line.line_number as number,
    lineText: line.line_text,
    likeCount: 0,
    dislikeCount: 0,
    netScore: 0,
    commentCount: 0,
    readerReachPercent: totalReaderCount > 0
      ? Math.round(((retentionMap[line.line_number as number] || 0) / totalReaderCount) * 100)
      : 0,
  }));

  const likesTotal = Number(reactionTotals.find(r => r.reaction === 'like')?.cnt ?? 0);
  const dislikesTotal = Number(reactionTotals.find(r => r.reaction === 'dislike')?.cnt ?? 0);

  console.timeEnd('[heatmap] total');
  return NextResponse.json({
    chapterVersionId,
    ranges,
    heatmap,
    totalReaders: totalReaderCount,
    totalLikes: likesTotal,
    totalDislikes: dislikesTotal,
  });
}
