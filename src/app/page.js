import { redirect } from 'next/navigation';
import { currentAccount, authDisabled } from '@server/auth';
import AuthPage from '@features/auth/components/AuthPage';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const account = await currentAccount();
  if (authDisabled() || account) redirect('/dashboard');
  return <AuthPage />;
}
