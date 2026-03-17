import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, chapterVersionId, startLine, endLine, reaction } = await req.json();

    if (!sessionId || !chapterVersionId || startLine == null || endLine == null || !reaction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['like', 'dislike'].includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    const sessions = await sql`SELECT reader_profile_id, reader_group_id, reader_invite_id FROM reader_sessions WHERE id = ${sessionId}`;
    if (sessions.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = sessions[0];

    const [r] = await sql`
      INSERT INTO feedback_reactions (reader_session_id, chapter_version_id, reader_profile_id, reader_group_id, reader_invite_id, start_line, end_line, reaction)
      VALUES (${sessionId}, ${chapterVersionId}, ${session.reader_profile_id}, ${session.reader_group_id}, ${session.reader_invite_id}, ${startLine}, ${endLine}, ${reaction})
      RETURNING id
    `;

    return NextResponse.json({ id: r.id });
  } catch (err) {
    console.error('Reaction error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
