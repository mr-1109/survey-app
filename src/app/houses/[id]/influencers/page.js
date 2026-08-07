import { requireAccount } from '@server/auth';
import InfluencerList from '@features/houses/components/InfluencerList';

export const dynamic = 'force-dynamic';

export default async function InfluencersPage({ params }) {
  await requireAccount();
  return <InfluencerList houseId={Number(params.id)} />;
}
