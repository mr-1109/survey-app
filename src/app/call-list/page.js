import { requireAccount } from '@server/auth';
import { CallList } from '@features/call-list';

export const dynamic = 'force-dynamic';

export default async function CallListPage() {
  await requireAccount();
  return <CallList />;
}
