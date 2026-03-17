import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';
import { isDashboardAuthed } from '@/lib/auth/dashboard';

// Legacy admin feedback route — redirects to new dashboard API.
export async function GET(request: NextRequest) {
  if (!await isDashboardAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const chapterVersionId = searchParams.get('chapterId');

    if (chapterVersionId) {
      const comments = await sql`
        SELECT fc.id, fc.start_line, fc.end_line, fc.body as comment, fc.created_at,
               rp.display_name as reader_name
        FROM feedback_comments fc
        LEFT JOIN reader_profiles rp ON rp.id = fc.reader_profile_id
        WHERE fc.chapter_version_id = ${chapterVersionId}
        ORDER BY fc.start_line, fc.created_at
      `;
      return NextResponse.json({ feedback: comments });
    }

    const comments = await sql`
      SELECT fc.id, fc.start_line, fc.end_line, fc.body as comment, fc.created_at,
             rp.display_name as reader_name, c.title as chapter_title
      FROM feedback_comments fc
      LEFT JOIN reader_profiles rp ON rp.id = fc.reader_profile_id
      LEFT JOIN chapter_versions cv ON cv.id = fc.chapter_version_id
      LEFT JOIN chapters c ON c.id = cv.chapter_id
      ORDER BY fc.created_at DESC
    `;
    return NextResponse.json({ feedback: comments });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
