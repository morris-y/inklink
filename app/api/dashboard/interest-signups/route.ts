import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';

export async function GET(req: NextRequest) {
  if (!await isDashboardAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workSlug = process.env.BOOK_SLUG || 'default';
  const signups = await sql`
    SELECT is.id, is.email, is.source, is.created_at,
      rp.display_name as reader_name, rg.name as group_name
    FROM interest_signups is
    JOIN works w ON w.id = is.work_id
    LEFT JOIN reader_profiles rp ON rp.id = is.reader_profile_id
    LEFT JOIN reader_groups rg ON rg.id = is.reader_group_id
    WHERE w.slug = ${workSlug}
    ORDER BY is.created_at DESC
  `;
  return NextResponse.json({ signups });
}
