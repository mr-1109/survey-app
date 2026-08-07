import { requireAccount } from '@server/auth';
import SummaryPage from '@features/houses/components/SummaryPage';

export const dynamic = 'force-dynamic';

export default async function HouseSummaryPage({ params }) {
  await requireAccount();
  return <SummaryPage houseId={Number(params.id)} />;
}
