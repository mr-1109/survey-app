import { requireAccount } from '@server/auth';
import SummaryPage from '@features/houses/components/SummaryPage';

export const dynamic = 'force-dynamic';

export default function HouseSummaryPage({ params }) {
  requireAccount();
  return <SummaryPage houseId={Number(params.id)} />;
}
