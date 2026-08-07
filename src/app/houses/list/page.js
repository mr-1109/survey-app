import { Suspense } from 'react';
import { requireAccount } from '@server/auth';
import HouseList from '@features/houses/components/HouseList';

export const dynamic = 'force-dynamic';

export default function HouseListPage() {
  await requireAccount();
  return (
    <Suspense fallback={null}>
      <HouseList />
    </Suspense>
  );
}
