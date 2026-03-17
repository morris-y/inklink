import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

interface Event {
  eventType: string;
  chapterVersionId?: string;
  payload?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, workId, events } = await req.json() as {
      sessionId: string;
      workId: string;
      events: Event[];
    };

    if (!sessionId || !workId || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get session attribution
    const sessions = await sql`SELECT reader_profile_id, reader_group_id, reader_invite_id FROM reader_sessions WHERE id = ${sessionId}`;
    if (sessions.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = sessions[0];

    for (const evt of events) {
      await sql`
        INSERT INTO event_log (reader_session_id, work_id, chapter_version_id, reader_profile_id, reader_group_id, reader_invite_id, event_type, payload)
        VALUES (
          ${sessionId}, ${workId}, ${evt.chapterVersionId ?? null},
          ${session.reader_profile_id}, ${session.reader_group_id}, ${session.reader_invite_id},
          ${evt.eventType}, ${JSON.stringify(evt.payload || {})}
        )
      `;

      // Update reader_sessions.last_seen_at
      await sql`UPDATE reader_sessions SET last_seen_at = now() WHERE id = ${sessionId}`;

      // Upsert chapter_reads for relevant events
      if (evt.chapterVersionId && ['chapter_viewed', 'heartbeat', 'scroll_depth', 'line_reached', 'chapter_completed'].includes(evt.eventType)) {
        const p = evt.payload || {};
        const maxLine = (p.maxLineSeen as number) || 0;
        const maxScroll = (p.maxScrollPercent as number) || 0;
        const activeSeconds = (p.activeSeconds as number) || 0;
        const completionPct = (p.completionPercent as number) || 0;
        const completedAt = evt.eventType === 'chapter_completed' ? new Date().toISOString() : null;

        await sql`
          INSERT INTO chapter_reads (reader_session_id, chapter_version_id, max_line_seen, max_scroll_percent, active_seconds, completion_percent, completed_at)
          VALUES (${sessionId}, ${evt.chapterVersionId}, ${maxLine}, ${maxScroll}, ${activeSeconds}, ${completionPct}, ${completedAt})
          ON CONFLICT (reader_session_id, chapter_version_id) DO UPDATE SET
            last_active_at = now(),
            max_line_seen = GREATEST(chapter_reads.max_line_seen, EXCLUDED.max_line_seen),
            max_scroll_percent = GREATEST(chapter_reads.max_scroll_percent, EXCLUDED.max_scroll_percent),
            active_seconds = chapter_reads.active_seconds + EXCLUDED.active_seconds,
            completion_percent = GREATEST(chapter_reads.completion_percent, EXCLUDED.completion_percent),
            completed_at = COALESCE(chapter_reads.completed_at, EXCLUDED.completed_at)
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Events batch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
