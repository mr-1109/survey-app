import { requireAccount } from '@server/auth';
import InfluencerList from '@features/houses/components/InfluencerList';

export const dynamic = 'force-dynamic';

export default function InfluencersPage({ params }) {
  requireAccount();
  return <InfluencerList houseId={Number(params.id)} />;
}
