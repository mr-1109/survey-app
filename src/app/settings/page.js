import { requireAccount } from '@server/auth';
import SettingsView from '@features/settings/components/SettingsView';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAccount();
  return <SettingsView />;
}
