import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const versions = await sql`
      SELECT cv.id, cv.version_number, cv.title, cv.line_count, cv.word_count, cv.created_at,
             dv.commit_sha as "commitSha", dv.commit_message as message, dv.commit_author as author,
             dv.commit_created_at as date,
             (SELECT COUNT(*) FROM feedback_reactions WHERE chapter_version_id = cv.id) +
             (SELECT COUNT(*) FROM feedback_comments WHERE chapter_version_id = cv.id) as "feedbackCount"
      FROM chapter_versions cv
      JOIN chapters c ON c.id = cv.chapter_id
      JOIN document_versions dv ON dv.id = cv.document_version_id
      WHERE c.id = ${id} OR c.slug = ${id}
      ORDER BY cv.version_number DESC
    `;

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching chapter versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}
