import { requireAccount } from '@server/auth';
import InfluencerForm from '@features/houses/components/InfluencerForm';

export const dynamic = 'force-dynamic';

export default function NewInfluencerPage({ params }) {
  await requireAccount();
  return <InfluencerForm houseId={Number(params.id)} />;
}
