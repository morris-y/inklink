import { NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // UUID pattern: use primary key lookup; otherwise fall back to slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const chapters = await sql`
      SELECT cv.id as version_id, c.id, c.slug, c.title, c.file_path as filename, c.sort_order as "order",
             cv.rendered_html as html, dv.commit_sha as "commitSha"
      FROM chapters c
      JOIN chapter_versions cv ON cv.chapter_id = c.id
      JOIN document_versions dv ON dv.id = cv.document_version_id
      WHERE ${isUuid ? sql`c.id = ${id}` : sql`c.slug = ${id}`}
      ORDER BY dv.deployed_at DESC
      LIMIT 1
    `;

    if (chapters.length === 0) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapter = chapters[0];

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        filename: chapter.filename,
        order: chapter.order,
      },
      versionId: chapter.version_id,
      html: chapter.html,
      commitSha: chapter.commitSha,
      abTests: [],
      assignments: {},
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter' }, { status: 500 });
  }
}
