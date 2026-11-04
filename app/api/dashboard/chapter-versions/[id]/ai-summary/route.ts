import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';
import { clusterFeedback, type AnchoredFeedback } from '@/lib/ai/feedback-clusters';
import { summarizeClusters, type AiSummaryResponse } from '@/lib/ai/summarize';

// Gemini can take ~60 s when the primary model is overloaded and we fall back.
export const maxDuration = 60;

// ponytail: cap prompt size; the busiest passages win. Raise or paginate if authors hit it.
const MAX_PASSAGES = 20;

// ponytail: per-instance memory cache keyed by version + filter + feedback fingerprint.
// New feedback changes the fingerprint, so stale summaries are never served.
const cache = new LRUCache<string, AiSummaryResponse>({ max: 200, ttl: 1000 * 60 * 60 * 24 });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Every call spends model quota, so this route must never be open.
  if (!(await isDashboardAuthed(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: chapterVersionId } = await params;
  const { searchParams } = new URL(req.url);
  const readerProfileId = searchParams.get('readerProfileId');
  const readerGroupId = searchParams.get('readerGroupId');

  const [comments, suggestions, dislikes] = await Promise.all([
    sql`SELECT fc.id, fc.body, fc.selected_text, fc.char_start, fc.char_length,
          COALESCE(rp.slug, fc.reader_session_id::text) AS reader
        FROM feedback_comments fc LEFT JOIN reader_profiles rp ON rp.id = fc.reader_profile_id
        WHERE fc.chapter_version_id = ${chapterVersionId}
        ${readerProfileId ? sql`AND fc.reader_profile_id = ${readerProfileId}` : sql``}
        ${readerGroupId ? sql`AND fc.reader_group_id = ${readerGroupId}` : sql``}`,
    sql`SELECT se.id, se.original_text, se.suggested_text, se.rationale, se.char_start, se.char_length,
          COALESCE(rp.slug, se.reader_session_id::text) AS reader
        FROM suggested_edits se LEFT JOIN reader_profiles rp ON rp.id = se.reader_profile_id
        WHERE se.chapter_version_id = ${chapterVersionId}
        ${readerProfileId ? sql`AND se.reader_profile_id = ${readerProfileId}` : sql``}
        ${readerGroupId ? sql`AND se.reader_group_id = ${readerGroupId}` : sql``}`,
    sql`SELECT fr.id, fr.selected_text, fr.char_start, fr.char_length,
          COALESCE(rp.slug, fr.reader_session_id::text) AS reader
        FROM feedback_reactions fr LEFT JOIN reader_profiles rp ON rp.id = fr.reader_profile_id
        WHERE fr.chapter_version_id = ${chapterVersionId} AND fr.reaction = 'dislike'
        ${readerProfileId ? sql`AND fr.reader_profile_id = ${readerProfileId}` : sql``}
        ${readerGroupId ? sql`AND fr.reader_group_id = ${readerGroupId}` : sql``}`,
  ]);

  const items: AnchoredFeedback[] = [
    ...comments.map(c => ({ id: c.id, kind: 'comment' as const, charStart: c.char_start, charLength: c.char_length, reader: c.reader, text: c.body, quote: c.selected_text })),
    ...suggestions.map(s => ({
      id: s.id, kind: 'suggestion' as const, charStart: s.char_start, charLength: s.char_length, reader: s.reader,
      text: `"${s.original_text}" → "${s.suggested_text}"${s.rationale ? ` (${s.rationale})` : ''}`, quote: s.original_text,
    })),
    ...dislikes.map(d => ({ id: d.id, kind: 'dislike' as const, charStart: d.char_start, charLength: d.char_length, reader: d.reader, text: '', quote: d.selected_text })),
  ];

  const clusters = clusterFeedback(items)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, MAX_PASSAGES)
    .sort((a, b) => a.charStart - b.charStart);

  const cacheKey = `${chapterVersionId}|${readerProfileId ?? ''}|${readerGroupId ?? ''}|${items.map(i => i.id).sort().join(',')}`;
  const hit = cache.get(cacheKey);
  if (hit) return NextResponse.json(hit);

  try {
    const response = await summarizeClusters(clusters, items.length);
    cache.set(cacheKey, response);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[ai-summary]', err);
    return NextResponse.json({ error: 'AI summary failed. Try again in a moment.' }, { status: 502 });
  }
}
