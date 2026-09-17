'use client';

// Client-side signing for the LI.FI Stellar leg (`nextAction.screen ===
// 'sign_stellar_tx'`) with an EXTERNAL Stellar wallet via Stellar Wallets Kit
// (Freighter, xBull, Lobstr, Albedo, Hana, Rabet, HOT). The payer signs two
// Soroban transactions — an expiring USDC `approve`, then LI.FI's `bridge` —
// and we report the bridge hash to Weave so it can track the CCTP transfer.
// Pollar custodial wallets follow the same sequence with `signAndSubmitTx`
// inside the corridor app; this helper is for the hosted SEP-24 page.
//
// Everything is dynamically imported: the kit touches `window`/localStorage at
// module load and must never run during SSR.

const HORIZON = 'https://horizon.stellar.org';
const PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

let kitReady: Promise<typeof import('@creit.tech/stellar-wallets-kit')> | null = null;

async function kit() {
  if (!kitReady) {
    kitReady = (async () => {
      const swk = await import('@creit.tech/stellar-wallets-kit');
      const [{ FreighterModule }, { xBullModule }, { LobstrModule }, { AlbedoModule }, { HanaModule }, { RabetModule }, { HotWalletModule }] = await Promise.all([
        import('@creit.tech/stellar-wallets-kit/modules/freighter'),
        import('@creit.tech/stellar-wallets-kit/modules/xbull'),
        import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
        import('@creit.tech/stellar-wallets-kit/modules/albedo'),
        import('@creit.tech/stellar-wallets-kit/modules/hana'),
        import('@creit.tech/stellar-wallets-kit/modules/rabet'),
        import('@creit.tech/stellar-wallets-kit/modules/hotwallet'),
      ]);
      swk.StellarWalletsKit.init({
        network: swk.Networks.PUBLIC,
        modules: [new FreighterModule(), new xBullModule(), new LobstrModule(), new AlbedoModule(), new HanaModule(), new RabetModule(), new HotWalletModule()],
      });
      return swk;
    })();
  }
  return kitReady;
}

/** Open the wallet picker and return the connected G-address. */
export async function connectStellarWallet(): Promise<string> {
  const swk = await kit();
  const { address } = await swk.StellarWalletsKit.authModal();
  return address;
}

/** Sign an XDR with the connected wallet and submit it to Horizon. Returns the tx hash. */
export async function signAndSubmitXdr(unsignedXdr: string, address: string): Promise<string> {
  const swk = await kit();
  const { signedTxXdr } = await swk.StellarWalletsKit.signTransaction(unsignedXdr, { networkPassphrase: PUBLIC_PASSPHRASE, address });
  const res = await fetch(`${HORIZON}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ tx: signedTxXdr }),
  });
  const json = await res.json();
  if (!res.ok) {
    const codes = json?.extras?.result_codes;
    throw new Error(`Stellar rejected the transaction${codes ? `: ${JSON.stringify(codes)}` : ''}`);
  }
  return json.hash as string;
}

export interface StellarSigningPayload {
  fromAddress: string;
  amount: number;
  approveXdr: string | null;
  approveTxPath?: string;       // re-issues the approve XDR (or null if the allowance suffices)
  bridgeTxPath: string;
  submittedPath: string;
}

/**
 * Run the full approve → bridge → report sequence against Weave. `api` performs
 * an authenticated POST to a Weave path (the caller supplies auth: publishable
 * key via the public proxy, or a secret key server-side).
 */
export async function runStellarBridgeFlow(
  payload: StellarSigningPayload,
  api: (path: string, body?: unknown) => Promise<{ ok: boolean; status: number; data: any; error?: string }>,
  sign: (unsignedXdr: string) => Promise<string>,
  onStage?: (stage: 'approve' | 'bridge' | 'submitting' | 'done', detail?: string) => void,
): Promise<{ approveHash: string | null; bridgeHash: string }> {
  let approveHash: string | null = null;
  let approveXdr = payload.approveXdr;
  if (!approveXdr && payload.approveTxPath) {
    // Resume / re-quote: ask Weave whether an allowance is still needed.
    const r = await api(payload.approveTxPath);
    if (!r.ok) throw new Error(r.error || 'Could not build the approval transaction');
    approveXdr = r.data?.unsignedXdr ?? null;
  }
  if (approveXdr) {
    onStage?.('approve');
    approveHash = await sign(approveXdr);
  }

  // The bridge XDR can only be simulated once the allowance is on-chain; Weave
  // answers 409 ALLOWANCE_PENDING until then. Stellar closes a ledger ~5s.
  onStage?.('bridge');
  let bridgeXdr: string | null = null;
  for (let attempt = 0; attempt < 12 && !bridgeXdr; attempt++) {
    const r = await api(payload.bridgeTxPath);
    if (r.ok) bridgeXdr = r.data.unsignedXdr;
    else if (r.status === 409) await new Promise(res => setTimeout(res, 4000));
    else throw new Error(r.error || 'Could not build the bridge transaction');
  }
  if (!bridgeXdr) throw new Error('The approval has not confirmed yet. Please try again in a moment.');

  const bridgeHash = await sign(bridgeXdr);
  onStage?.('submitting', bridgeHash);
  const rep = await api(payload.submittedPath, { txHash: bridgeHash });
  if (!rep.ok) throw new Error(rep.error || 'Could not record the bridge transaction');
  onStage?.('done', bridgeHash);
  return { approveHash, bridgeHash };
}
