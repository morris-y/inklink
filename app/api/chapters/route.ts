import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/client';

export async function GET(req: NextRequest) {
  try {
    const workSlug = process.env.BOOK_SLUG || 'default';
    const includeFirst = req.nextUrl.searchParams.get('includeFirst') === '1';

    const chapters = await sql`
      SELECT c.id, c.slug, c.title, c.file_path as filename, c.sort_order as "order", c.created_at
      FROM chapters c
      JOIN works w ON w.id = c.work_id
      WHERE w.slug = ${workSlug}
      ORDER BY c.sort_order
    `;

    let firstChapter = null;
    if (includeFirst && chapters.length > 0) {
      const firstId = chapters[0].id;
      const [cv] = await sql`
        SELECT cv.id as version_id, cv.rendered_html as html, dv.commit_sha as "commitSha"
        FROM chapter_versions cv
        JOIN document_versions dv ON dv.id = cv.document_version_id
        WHERE cv.chapter_id = ${firstId}
        ORDER BY dv.deployed_at DESC
        LIMIT 1
      `;
      if (cv) {
        firstChapter = {
          chapter: { id: chapters[0].id, slug: chapters[0].slug, title: chapters[0].title, filename: chapters[0].filename, order: chapters[0].order },
          versionId: cv.version_id,
          html: cv.html,
          commitSha: cv.commitSha,
        };
      }
    }

    return NextResponse.json({ chapters, firstChapter });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 });
  }
}
