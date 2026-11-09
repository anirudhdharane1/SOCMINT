import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { InvestigateClient } from '@/components/InvestigateClient';

export default async function InvestigatePage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell user={session}>
      <InvestigateClient />
    </AppShell>
  );
}

