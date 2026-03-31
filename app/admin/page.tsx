import AuthorDashboard from '@/components/AuthorDashboard';
import { isDashboardProtected } from '@/lib/auth/dashboard';

export default function AdminPage() {
  return <AuthorDashboard isProtected={isDashboardProtected()} />;
}
