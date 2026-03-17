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

  const comments = await sql`
    SELECT fc.id, fc.start_line, fc.end_line, fc.body, fc.created_at,
      rp.display_name as reader_name, rp.slug as reader_slug,
      rg.name as group_name, rg.slug as group_slug
    FROM feedback_comments fc
    LEFT JOIN reader_profiles rp ON rp.id = fc.reader_profile_id
    LEFT JOIN reader_groups rg ON rg.id = fc.reader_group_id
    WHERE fc.chapter_version_id = ${chapterVersionId}
    ${readerProfileId ? sql`AND fc.reader_profile_id = ${readerProfileId}` : sql``}
    ${readerGroupId ? sql`AND fc.reader_group_id = ${readerGroupId}` : sql``}
    ${readerInviteId ? sql`AND fc.reader_invite_id = ${readerInviteId}` : sql``}
    ORDER BY fc.start_line, fc.created_at
  `;

  const suggestions = await sql`
    SELECT se.id, se.start_line, se.end_line, se.original_text, se.suggested_text, se.rationale, se.created_at,
      rp.display_name as reader_name, rp.slug as reader_slug,
      rg.name as group_name, rg.slug as group_slug
    FROM suggested_edits se
    LEFT JOIN reader_profiles rp ON rp.id = se.reader_profile_id
    LEFT JOIN reader_groups rg ON rg.id = se.reader_group_id
    WHERE se.chapter_version_id = ${chapterVersionId}
    ${readerProfileId ? sql`AND se.reader_profile_id = ${readerProfileId}` : sql``}
    ${readerGroupId ? sql`AND se.reader_group_id = ${readerGroupId}` : sql``}
    ${readerInviteId ? sql`AND se.reader_invite_id = ${readerInviteId}` : sql``}
    ORDER BY se.start_line, se.created_at
  `;

  const reactions = await sql`
    SELECT fr.id, fr.start_line, fr.end_line, fr.reaction, fr.created_at,
      rp.display_name as reader_name, rp.slug as reader_slug
    FROM feedback_reactions fr
    LEFT JOIN reader_profiles rp ON rp.id = fr.reader_profile_id
    WHERE fr.chapter_version_id = ${chapterVersionId}
    ${readerProfileId ? sql`AND fr.reader_profile_id = ${readerProfileId}` : sql``}
    ${readerGroupId ? sql`AND fr.reader_group_id = ${readerGroupId}` : sql``}
    ${readerInviteId ? sql`AND fr.reader_invite_id = ${readerInviteId}` : sql``}
    ORDER BY fr.start_line, fr.created_at
  `;

  return NextResponse.json({ comments, suggestions, reactions });
}
