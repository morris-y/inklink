import sql from '@/lib/db/client';
import { getWorkSlug } from '@/lib/slug';
import HomePageClient from './_home-client';

export const revalidate = 300; // revalidate every 5 minutes

async function getChapters() {
  const workSlug = getWorkSlug();
  return sql`
    SELECT c.id, c.slug, c.title, c.file_path as filename, c.sort_order as "order", c.created_at,
      (SELECT MAX(dv.deployed_at)
       FROM chapter_versions cv
       JOIN document_versions dv ON dv.id = cv.document_version_id
       WHERE cv.chapter_id = c.id
      ) as last_updated
    FROM chapters c
    JOIN works w ON w.id = c.work_id
    WHERE w.slug = ${workSlug}
    ORDER BY c.sort_order
  `;
}

export default async function Home() {
  const chapters = await getChapters();
  return <HomePageClient chapters={chapters as any} />;
}
