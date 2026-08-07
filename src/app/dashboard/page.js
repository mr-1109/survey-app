import { requireAccount } from '@server/auth';
import SurveyDashboard from '@features/houses/components/SurveyDashboard';

export const dynamic = 'force-dynamic';

/**
 * लॉगिन के बाद की landing page — सर्वेक्षण ऐप का डैशबोर्ड (होम), screen 1.
 * पुराना AC188 मतदाता डैशबोर्ड अब /dashboard/voters पर उपलब्ध है।
 */
export default async function DashboardPage() {
  await requireAccount();
  return <SurveyDashboard />;
}
