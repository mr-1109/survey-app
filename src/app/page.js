import { redirect } from 'next/navigation';
import { currentAccount, authDisabled } from '@server/auth';
import AuthPage from '@features/auth/components/AuthPage';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Already signed in (or auth switched off for preview) — skip the form.
  if (authDisabled() || currentAccount()) redirect('/dashboard');
  return <AuthPage />;
}
