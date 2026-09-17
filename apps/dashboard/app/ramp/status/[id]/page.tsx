// SEP-24 `more_info_url` target: a public, token-less status view of one
// anchor transaction (non-sensitive fields only). Polls via the public proxy.
import StatusClient from './StatusClient';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StatusClient id={id} />;
}
