import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AccountDetailClient } from '@/components/AccountDetailClient';

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <AppShell user={session}>
      <AccountDetailClient accountId={id} userRole={session.role} />
    </AppShell>
  );
}

