import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const workSlug = getWorkSlug();
  const chapters = await sql`
    SELECT c.id, c.slug, c.title, c.file_path, c.sort_order, c.created_at
    FROM chapters c
    JOIN works w ON w.id = c.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY c.sort_order
  `;

  return NextResponse.json({ chapters });
}
