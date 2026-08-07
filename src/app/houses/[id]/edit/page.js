import { requireAccount } from '@server/auth';
import HouseFormPage from '@features/houses/components/HouseFormPage';

export const dynamic = 'force-dynamic';

export default function EditHousePage({ params }) {
  requireAccount();
  return <HouseFormPage mode="edit" houseId={Number(params.id)} />;
}
