import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { nanoid } from 'nanoid';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const workSlug = getWorkSlug();
  const groups = await sql`
    SELECT rg.id, rg.slug, rg.name, rg.description, rg.created_at
    FROM reader_groups rg
    JOIN works w ON w.id = rg.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY rg.created_at DESC
  `;
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const workSlug = getWorkSlug();
  const works = await sql`SELECT id FROM works WHERE slug = ${workSlug}`;
  if (works.length === 0) return NextResponse.json({ error: 'Work not found' }, { status: 404 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + nanoid(4);
  const [group] = await sql`
    INSERT INTO reader_groups (work_id, slug, name, description)
    VALUES (${works[0].id}, ${slug}, ${name}, ${description ?? null})
    RETURNING id, slug, name, description, created_at
  `;
  return NextResponse.json({ group });
}
