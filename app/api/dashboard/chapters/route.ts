import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';

export async function GET(req: NextRequest) {
  if (!await isDashboardAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workSlug = process.env.BOOK_SLUG || 'default';
  const chapters = await sql`
    SELECT c.id, c.slug, c.title, c.file_path, c.sort_order, c.created_at
    FROM chapters c
    JOIN works w ON w.id = c.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY c.sort_order
  `;

  return NextResponse.json({ chapters });
}
