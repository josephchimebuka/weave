import { requireServerSession } from '../lib/auth-server';
import AuditLogClient from './AuditLogClient';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const { user } = await requireServerSession();
  return (
    <AuditLogClient
      isAdmin={!!user.isPlatformAdmin}
      merchantName={user.name}
    />
  );
}
