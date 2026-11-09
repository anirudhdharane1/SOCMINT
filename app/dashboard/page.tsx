import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { DashboardClient } from '@/components/DashboardClient';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell user={session}>
      <DashboardClient />
    </AppShell>
  );
}
