import { requireAccount } from '@server/auth';
import FamilySurveyWizard from '@features/houses/components/FamilySurveyWizard';

export const dynamic = 'force-dynamic';

export default function FamilySurveyPage({ params }) {
  requireAccount();
  return <FamilySurveyWizard houseId={Number(params.id)} />;
}
