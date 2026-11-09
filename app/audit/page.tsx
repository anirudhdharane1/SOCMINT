import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AuditClient } from '@/components/AuditClient';

export default async function AuditPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Admin only requirement
  if (session.role !== 'Admin') {
    redirect('/dashboard');
  }

  return (
    <AppShell user={session}>
      <AuditClient />
    </AppShell>
  );
}

