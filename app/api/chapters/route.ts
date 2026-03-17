import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET() {
  try {
    const workSlug = process.env.BOOK_SLUG || 'default';
    const chapters = await sql`
      SELECT c.id, c.slug, c.title, c.file_path as filename, c.sort_order as "order", c.created_at
      FROM chapters c
      JOIN works w ON w.id = c.work_id
      WHERE w.slug = ${workSlug}
      ORDER BY c.sort_order
    `;

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}
