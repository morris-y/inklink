import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { getWorkSlug } from '@/lib/slug';

export async function GET(req: NextRequest) {
  const workSlug = getWorkSlug();
  const signups = await sql`
    SELECT ins.id, ins.email, ins.source, ins.created_at,
      rp.display_name as reader_name, rg.name as group_name
    FROM interest_signups ins
    JOIN works w ON w.id = ins.work_id
    LEFT JOIN reader_profiles rp ON rp.id = ins.reader_profile_id
    LEFT JOIN reader_groups rg ON rg.id = ins.reader_group_id
    WHERE w.slug = ${workSlug}
    ORDER BY ins.created_at DESC
  `;
  return NextResponse.json({ signups });
}
