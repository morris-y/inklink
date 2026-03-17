import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { resolveInviteToken } from '@/lib/invites/resolve-invite';
import { nanoid } from 'nanoid';
import { ensureIngested } from '@/lib/ingest/run-ingest';

export async function POST(req: NextRequest) {
  try {
    const { workSlug, inviteToken, anonymousId: existingAnonId } = await req.json();

    await ensureIngested();

    const works = await sql`SELECT id FROM works WHERE slug = ${workSlug || process.env.BOOK_SLUG || 'default'}`;
    if (works.length === 0) return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    const workId = works[0].id as string;

    const anonymousId = existingAnonId || nanoid();

    let readerProfileId: string | null = null;
    let readerGroupId: string | null = null;
    let readerInviteId: string | null = null;

    if (inviteToken) {
      const resolved = await resolveInviteToken(inviteToken, workId);
      if (resolved) {
        readerProfileId = resolved.readerProfileId;
        readerGroupId = resolved.readerGroupId;
        readerInviteId = resolved.inviteId;
      }
    }

    // Reuse existing session for this anonymousId if possible
    const existing = existingAnonId ? await sql`
      SELECT id, anonymous_id, reader_profile_id, reader_group_id, reader_invite_id
      FROM reader_sessions
      WHERE work_id = ${workId} AND anonymous_id = ${anonymousId}
      ORDER BY first_seen_at ASC
      LIMIT 1
    ` : [];

    if (existing.length > 0) {
      const result = existing[0];
      return NextResponse.json({
        sessionId: result.id,
        anonymousId: result.anonymous_id,
        readerProfileId: result.reader_profile_id,
        readerGroupId: result.reader_group_id,
        readerInviteId: result.reader_invite_id,
      });
    }

    // Create new session
    const [session] = await sql`
      INSERT INTO reader_sessions (work_id, anonymous_id, reader_profile_id, reader_group_id, reader_invite_id, last_seen_at)
      VALUES (${workId}, ${anonymousId}, ${readerProfileId}, ${readerGroupId}, ${readerInviteId}, now())
      RETURNING id, anonymous_id, reader_profile_id, reader_group_id, reader_invite_id
    `;

    const result = session;
    if (!result) return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });

    return NextResponse.json({
      sessionId: result.id,
      anonymousId: result.anonymous_id,
      readerProfileId: result.reader_profile_id,
      readerGroupId: result.reader_group_id,
      readerInviteId: result.reader_invite_id,
    });
  } catch (err) {
    console.error('Session error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
