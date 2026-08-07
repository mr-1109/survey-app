import { requireAccount } from '@server/auth';
import MemberList from '@features/houses/components/MemberList';

export const dynamic = 'force-dynamic';

export default function MembersPage({ params }) {
  await requireAccount();
  return <MemberList houseId={Number(params.id)} />;
}
