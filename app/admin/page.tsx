import AuthorDashboard from '@/components/AuthorDashboard';
import { isDashboardAuthed, isDashboardProtected } from '@/lib/auth/dashboard';

export default async function AdminPage() {
  // Read the cookie on the server so a logged-in visit renders the dashboard directly.
  return <AuthorDashboard isProtected={isDashboardProtected()} initiallyAuthed={await isDashboardAuthed()} />;
}
