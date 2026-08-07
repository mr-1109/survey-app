import { requireAccount } from '@server/auth';
import MemberForm from '@features/houses/components/MemberForm';

export const dynamic = 'force-dynamic';

export default function EditMemberPage({ params }) {
  await requireAccount();
  return <MemberForm houseId={Number(params.id)} memberId={Number(params.mid)} />;
}
