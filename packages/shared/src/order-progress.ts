// User-visible checkout progress from API order + route steps.

export type ProgressStepState = 'pending' | 'active' | 'done';

export type ProgressStep = {
  id: string;
  label: string;
  sub: string;
  state: ProgressStepState;
  explorerUrl?: string;
};

type RouteStep = {
  provider?: string;
  status?: string;
  externalId?: string | null;
  depositMemo?: string | null;
  fromAsset?: string;
  toAsset?: string;
};

function stepDone(status: string | undefined): boolean {
  return String(status ?? '').toLowerCase() === 'done';
}

function stepFailed(status: string | undefined): boolean {
  return String(status ?? '').toLowerCase() === 'failed';
}

function stepActive(status: string | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'awaiting_deposit' || s === 'in_flight' || s === 'pending';
}

export function stellarTxExplorerUrl(txHash: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const base =
    network === 'mainnet'
      ? 'https://stellar.expert/explorer/public'
      : 'https://stellar.expert/explorer/testnet';
  return `${base}/tx/${txHash}`;
}

function providerStep(
  step: RouteStep,
  ctx: { merchantName: string; currency: string; paycrestStatus?: string | null; nearStatus?: string | null },
  stellarNetwork: 'testnet' | 'mainnet',
): { label: string; sub: string; state: ProgressStepState; explorerUrl?: string } {
  const provider = String(step.provider ?? '').toLowerCase();
  const st = String(step.status ?? '').toLowerCase();
  const pc = String(ctx.paycrestStatus ?? '').toLowerCase();
  const near = String(ctx.nearStatus ?? '').toLowerCase();

  if (provider === 'stellar') {
    const hash = step.externalId && step.externalId.length > 8 && !step.externalId.includes(':')
      ? step.externalId
      : null;
    let state: ProgressStepState = 'pending';
    if (stepDone(st)) state = 'done';
    else if (!stepFailed(st)) state = 'active';

    return {
      label: stepDone(st) ? 'Payment confirmed on Stellar' : 'Confirming your Stellar payment',
      sub: stepDone(st)
        ? 'Your transfer matched this cash-out'
        : 'We watch the network for your USDC and memo',
      state,
      explorerUrl: hash ? stellarTxExplorerUrl(hash, stellarNetwork) : undefined,
    };
  }

  if (provider === 'nearintents') {
    let state: ProgressStepState = 'pending';
    if (stepDone(st)) state = 'done';
    else if (stepActive(st)) state = 'active';
    if (near === 'processing' && !stepDone(st)) state = 'active';

    const awaiting = st === 'awaiting_deposit';
    return {
      label: stepDone(st) ? 'Deposit received' : awaiting ? 'Waiting for your transfer' : 'Processing your deposit',
      sub: stepDone(st)
        ? 'Conversion complete'
        : awaiting
          ? 'Send the exact amount below — we detect it automatically'
          : near === 'incomplete_deposit'
            ? 'Partial deposit — send the rest or contact support'
            : 'Preparing your bank payout',
      state,
    };
  }

  if (provider === 'paycrest') {
    let state: ProgressStepState = 'pending';
    if (stepDone(st)) state = 'done';
    else if (stepActive(st) || ['deposited', 'pending', 'fulfilling', 'fulfilled', 'validated', 'settling'].includes(pc)) {
      state = 'active';
    }
    if (['settled', 'completed'].includes(pc)) state = 'done';

    return {
      label: state === 'done' ? 'Sent to your bank' : `Sending ${ctx.currency} to your bank`,
      sub:
        state === 'done'
          ? 'Your payout is complete'
          : pc === 'fulfilled' || pc === 'settling'
            ? 'Funds should arrive in your account shortly'
            : 'Settling to your Nigerian bank account',
      state,
    };
  }

  if (provider === 'lifi' || provider === 'chainrails') {
    return {
      label: stepDone(st) ? 'Bridge complete' : 'Moving funds',
      sub: stepDone(st) ? 'Ready for bank settlement' : 'Confirming on-chain transfer',
      state: stepDone(st) ? 'done' : stepActive(st) ? 'active' : 'pending',
    };
  }

  if (provider === 'direct') {
    return {
      label: stepDone(st) ? 'Transfer confirmed' : 'Confirming on-chain',
      sub: 'Verifying your crypto transfer',
      state: stepDone(st) ? 'done' : stepActive(st) ? 'active' : 'pending',
    };
  }

  return {
    label: stepDone(st) ? 'Step complete' : 'Processing',
    sub: provider || 'Payment in progress',
    state: stepDone(st) ? 'done' : stepActive(st) ? 'active' : 'pending',
  };
}

export function buildCryptoOfframpProgress(
  order: {
    steps?: RouteStep[];
    status?: string;
    paycrestStatus?: string | null;
    nearStatus?: string | null;
  } | null,
  opts: {
    merchantName: string;
    currency: string;
    walletAddress?: string | null;
    submittedTxHash?: string | null;
    stellarNetwork?: 'testnet' | 'mainnet';
  },
): { steps: ProgressStep[]; activeIndex: number } {
  const stellarNetwork = opts.stellarNetwork ?? 'testnet';
  const steps: ProgressStep[] = [];
  const routeSteps = order?.steps ?? [];

  if (opts.walletAddress) {
    steps.push({
      id: 'wallet',
      label: 'Wallet connected',
      sub: `${opts.walletAddress.slice(0, 6)}…${opts.walletAddress.slice(-4)}`,
      state: 'done',
    });
  }

  if (opts.submittedTxHash) {
    const stellarStep = routeSteps.find(s => s.provider === 'stellar');
    const confirmed = stellarStep && stepDone(stellarStep.status);
    steps.push({
      id: 'submitted',
      label: 'Payment submitted',
      sub: confirmed ? 'Transaction included on Stellar' : 'Waiting for network confirmation',
      state: confirmed ? 'done' : 'active',
      explorerUrl: stellarTxExplorerUrl(opts.submittedTxHash, stellarNetwork),
    });
  }

  for (let i = 0; i < routeSteps.length; i++) {
    const rs = routeSteps[i];
    const mapped = providerStep(rs, {
      merchantName: opts.merchantName,
      currency: opts.currency,
      paycrestStatus: order?.paycrestStatus,
      nearStatus: order?.nearStatus,
    }, stellarNetwork);
    steps.push({
      id: `route-${i}-${rs.provider}`,
      ...mapped,
    });
  }

  if (steps.length === 0) {
    steps.push(
      { id: 'confirm', label: 'Confirming transfer', sub: 'Processing on-chain', state: 'active' },
      { id: 'settle', label: 'Bank payout', sub: `Settling ${opts.currency}`, state: 'pending' },
    );
  }

  let activeIndex = steps.findIndex(s => s.state === 'active');
  if (activeIndex === -1) {
    const firstPending = steps.findIndex(s => s.state === 'pending');
    activeIndex = firstPending === -1 ? Math.max(0, steps.length - 1) : firstPending;
  }

  const orderStatus = String(order?.status ?? '').toLowerCase();
  if (orderStatus === 'completed') {
    steps.forEach(s => { s.state = 'done'; });
    activeIndex = steps.length - 1;
  }

  return { steps, activeIndex };
}

export function buildFiatOnrampProgress(
  merchantName: string,
  fiatDisplay: string,
  paycrestStatus?: string | null,
): { steps: ProgressStep[]; activeIndex: number } {
  const pc = String(paycrestStatus ?? '').toLowerCase();
  const steps: ProgressStep[] = [
    {
      id: 'fiat-in',
      label: 'Confirming your transfer',
      sub: `Matching the ${fiatDisplay} from your bank`,
      state: ['deposited', 'pending', 'fulfilling', 'fulfilled', 'settled'].includes(pc) ? 'done' : 'active',
    },
    {
      id: 'fiat-out',
      label: 'Completing payment',
      sub: `Sending to ${merchantName}`,
      state: ['fulfilled', 'settled'].includes(pc) ? 'done' : pc ? 'active' : 'pending',
    },
  ];
  let activeIndex = steps.findIndex(s => s.state === 'active');
  if (activeIndex === -1) activeIndex = steps.findIndex(s => s.state === 'pending');
  if (activeIndex === -1) activeIndex = steps.length - 1;
  return { steps, activeIndex };
}
