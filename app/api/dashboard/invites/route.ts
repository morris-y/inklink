import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { nanoid } from 'nanoid';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const workSlug = getWorkSlug();
  const invites = await sql`
    SELECT ri.id, ri.token, ri.label, ri.is_active, ri.expires_at, ri.created_at,
      rp.display_name as reader_name, rp.slug as reader_slug,
      rg.name as group_name, rg.slug as group_slug
    FROM reader_invites ri
    JOIN works w ON w.id = ri.work_id
    LEFT JOIN reader_profiles rp ON rp.id = ri.reader_profile_id
    LEFT JOIN reader_groups rg ON rg.id = ri.reader_group_id
    WHERE w.slug = ${workSlug}
    ORDER BY ri.created_at DESC
  `;
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const { readerProfileId, readerGroupId, label, expiresAt } = await req.json();

  const workSlug = getWorkSlug();
  const works = await sql`SELECT id FROM works WHERE slug = ${workSlug}`;
  if (works.length === 0) return NextResponse.json({ error: 'Work not found' }, { status: 404 });

  // Use reader slug or group slug as memorable token, fallback to nanoid
  let token = nanoid(10);
  if (readerProfileId) {
    const profiles = await sql`SELECT slug FROM reader_profiles WHERE id = ${readerProfileId}`;
    if (profiles.length > 0) token = profiles[0].slug as string;
  } else if (readerGroupId) {
    const groups = await sql`SELECT slug FROM reader_groups WHERE id = ${readerGroupId}`;
    if (groups.length > 0) token = groups[0].slug as string;
  }

  const [invite] = await sql`
    INSERT INTO reader_invites (work_id, token, reader_profile_id, reader_group_id, label, expires_at)
    VALUES (${works[0].id}, ${token}, ${readerProfileId ?? null}, ${readerGroupId ?? null}, ${label ?? null}, ${expiresAt ?? null})
    ON CONFLICT (token) DO UPDATE SET token = ${token + '-' + nanoid(4)}
    RETURNING id, token, label, is_active, expires_at, created_at
  `;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return NextResponse.json({
    invite,
    readUrl: `${baseUrl}/read/i/${invite.token}`,
  });
}
