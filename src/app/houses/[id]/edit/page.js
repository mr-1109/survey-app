import { requireAccount } from '@server/auth';
import HouseFormPage from '@features/houses/components/HouseFormPage';

export const dynamic = 'force-dynamic';

export default async function EditHousePage({ params }) {
  await requireAccount();
  return <HouseFormPage mode="edit" houseId={Number(params.id)} />;
}
