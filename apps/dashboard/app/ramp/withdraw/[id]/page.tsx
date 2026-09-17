import RampClient from '../../RampClient';

// SEP-24 interactive withdrawal page (Weave as a Stellar anchor). Opened by the
// wallet with a one-time `token`; see api/routes/stellar-anchor.ts.
export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : null;
  const lang = typeof sp.lang === 'string' ? sp.lang : undefined;
  return <RampClient id={id} kind="withdrawal" token={token} lang={lang} />;
}
