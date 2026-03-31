import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { ensureIngested } from '@/lib/ingest/run-ingest';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  await ensureIngested();

  const workSlug = getWorkSlug();
  const versions = await sql`
    SELECT dv.id, dv.commit_sha, dv.commit_message, dv.commit_author, dv.commit_created_at, dv.deployed_at
    FROM document_versions dv
    JOIN works w ON w.id = dv.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY dv.deployed_at DESC
  `;

  return NextResponse.json({ versions });
}
