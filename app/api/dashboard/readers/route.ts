import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { nanoid } from 'nanoid';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const workSlug = getWorkSlug();
  const readers = await sql`
    SELECT rp.id, rp.slug, rp.display_name, rp.email, rp.notes, rp.created_at
    FROM reader_profiles rp
    JOIN works w ON w.id = rp.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY rp.created_at DESC
  `;
  return NextResponse.json({ readers });
}

export async function POST(req: NextRequest) {
  const { displayName, email, notes } = await req.json();
  if (!displayName) return NextResponse.json({ error: 'displayName required' }, { status: 400 });

  const workSlug = getWorkSlug();
  const works = await sql`SELECT id FROM works WHERE slug = ${workSlug}`;
  if (works.length === 0) return NextResponse.json({ error: 'Work not found' }, { status: 404 });

  const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + nanoid(4);
  const [reader] = await sql`
    INSERT INTO reader_profiles (work_id, slug, display_name, email, notes)
    VALUES (${works[0].id}, ${slug}, ${displayName}, ${email ?? null}, ${notes ?? null})
    RETURNING id, slug, display_name, email, notes, created_at
  `;
  return NextResponse.json({ reader });
}
