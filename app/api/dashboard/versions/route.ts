import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';
import { ensureIngested } from '@/lib/ingest/run-ingest';

export async function GET(req: NextRequest) {
  if (!await isDashboardAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureIngested();

  const workSlug = process.env.BOOK_SLUG || 'default';
  const versions = await sql`
    SELECT dv.id, dv.commit_sha, dv.commit_message, dv.commit_author, dv.commit_created_at, dv.deployed_at
    FROM document_versions dv
    JOIN works w ON w.id = dv.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY dv.deployed_at DESC
  `;

  return NextResponse.json({ versions });
}
