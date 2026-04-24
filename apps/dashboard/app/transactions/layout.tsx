import { requireServerSession } from '../lib/auth-server';

export default async function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerSession();
  return <>{children}</>;
}
