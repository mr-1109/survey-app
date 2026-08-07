import { requireAccount } from '@server/auth';
import InfluencerForm from '@features/houses/components/InfluencerForm';

export const dynamic = 'force-dynamic';

export default async function EditInfluencerPage({ params }) {
  await requireAccount();
  return <InfluencerForm houseId={Number(params.id)} influencerId={Number(params.pid)} />;
}
