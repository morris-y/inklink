import { redirect } from 'next/navigation';

export default async function ReaderSlugPage({ params }: { params: Promise<{ readerSlug: string }> }) {
  const { readerSlug } = await params;
  // Resolve slug to invite token or just pass slug
  redirect(`/read?reader=${readerSlug}`);
}
