import { redirect } from 'next/navigation';
import { requireAccount } from '@server/auth';

export const dynamic = 'force-dynamic';

/** डैशबोर्ड (होम) अब /dashboard पर है — landing page का एक ही असली पता। */
export default function HousesHomePage() {
  requireAccount();
  redirect('/dashboard');
}
