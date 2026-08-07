import { requireAccount } from '@server/auth';
import UsersView from '@features/users/components/UsersView';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  requireAccount();
  return <UsersView />;
}
