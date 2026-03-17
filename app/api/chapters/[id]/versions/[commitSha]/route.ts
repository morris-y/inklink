import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; commitSha: string }> }
) {
  try {
    const { id, commitSha } = await context.params;

    const versions = await sql`
      SELECT cv.id, cv.raw_markdown as content, cv.rendered_html as html, cv.title,
             dv.commit_sha, dv.commit_author as author, dv.commit_created_at as date, dv.commit_message as message
      FROM chapter_versions cv
      JOIN chapters c ON c.id = cv.chapter_id
      JOIN document_versions dv ON dv.id = cv.document_version_id
      WHERE (c.id = ${id} OR c.slug = ${id}) AND dv.commit_sha = ${commitSha}
      LIMIT 1
    `;

    if (versions.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const v = versions[0];

    return NextResponse.json({
      version: {
        commitSha: v.commit_sha,
        date: v.date,
        author: v.author,
        message: v.message,
      },
      versionId: v.id,
      content: v.content,
      html: v.html,
      feedback: [],
      wordTokens: [],
    });
  } catch (error) {
    console.error('Error fetching chapter version:', error);
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 });
  }
}
