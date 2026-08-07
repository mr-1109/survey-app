import { requireAccount } from '@server/auth';
import HouseFormPage from '@features/houses/components/HouseFormPage';

export const dynamic = 'force-dynamic';

export default function NewHousePage() {
  await requireAccount();
  return <HouseFormPage mode="new" />;
}
