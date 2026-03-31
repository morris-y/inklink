import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;

  const timeline = await sql`
    SELECT
      cv.id,
      cv.version_number,
      cv.title,
      cv.line_count,
      cv.word_count,
      cv.created_at,
      dv.commit_sha,
      dv.commit_message,
      dv.commit_author,
      dv.commit_created_at,
      (SELECT COUNT(*) FROM feedback_reactions WHERE chapter_version_id = cv.id) as reaction_count,
      (SELECT COUNT(*) FROM feedback_comments WHERE chapter_version_id = cv.id) as comment_count,
      (SELECT COUNT(*) FROM suggested_edits WHERE chapter_version_id = cv.id) as suggestion_count
    FROM chapter_versions cv
    JOIN document_versions dv ON dv.id = cv.document_version_id
    WHERE cv.chapter_id = ${chapterId}
    ORDER BY cv.version_number DESC
  `;

  return NextResponse.json({ timeline });
}
