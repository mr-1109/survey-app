import { Suspense } from 'react';
import { requireAccount } from '@server/auth';
import HouseDetail from '@features/houses/components/HouseDetail';

export const dynamic = 'force-dynamic';

export default async function HouseDetailPage({ params }) {
  await requireAccount();
  return (
    <Suspense fallback={null}>
      <HouseDetail houseId={Number(params.id)} />
    </Suspense>
  );
}
