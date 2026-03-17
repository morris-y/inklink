import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, chapterVersionId, startLine, endLine, originalText, suggestedText, rationale } = await req.json();

    if (!sessionId || !chapterVersionId || startLine == null || endLine == null || !originalText || !suggestedText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sessions = await sql`SELECT reader_profile_id, reader_group_id, reader_invite_id FROM reader_sessions WHERE id = ${sessionId}`;
    if (sessions.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = sessions[0];

    const [s] = await sql`
      INSERT INTO suggested_edits (reader_session_id, chapter_version_id, reader_profile_id, reader_group_id, reader_invite_id, start_line, end_line, original_text, suggested_text, rationale)
      VALUES (${sessionId}, ${chapterVersionId}, ${session.reader_profile_id}, ${session.reader_group_id}, ${session.reader_invite_id}, ${startLine}, ${endLine}, ${originalText}, ${suggestedText}, ${rationale ?? null})
      RETURNING id
    `;

    return NextResponse.json({ id: s.id });
  } catch (err) {
    console.error('Suggestion error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
