import { redirect } from 'next/navigation';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Pass token to reader page via search param
  redirect(`/read?invite=${token}`);
}
