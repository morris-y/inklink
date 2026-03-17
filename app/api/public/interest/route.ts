import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const { email, workSlug, sessionId, chapterVersionId } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const works = await sql`SELECT id FROM works WHERE slug = ${workSlug || process.env.BOOK_SLUG || 'default'}`;
    if (works.length === 0) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    const workId = works[0].id as string;

    let readerProfileId = null, readerGroupId = null, readerInviteId = null;
    if (sessionId) {
      const sessions = await sql`SELECT reader_profile_id, reader_group_id, reader_invite_id FROM reader_sessions WHERE id = ${sessionId}`;
      if (sessions.length > 0) {
        readerProfileId = sessions[0].reader_profile_id;
        readerGroupId = sessions[0].reader_group_id;
        readerInviteId = sessions[0].reader_invite_id;
      }
    }

    await sql`
      INSERT INTO interest_signups (work_id, reader_session_id, reader_profile_id, reader_group_id, reader_invite_id, chapter_version_id, email, source)
      VALUES (${workId}, ${sessionId ?? null}, ${readerProfileId}, ${readerGroupId}, ${readerInviteId}, ${chapterVersionId ?? null}, ${email}, 'reader_cta')
      ON CONFLICT (work_id, email) DO NOTHING
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Interest signup error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
