/** Map Horizon / Freighter / SDK errors to payer-friendly copy. */

export function mapStellarPaymentError(raw: unknown): string {
  const msg = String(
    (raw as any)?.message ??
    (raw as any)?.response?.data?.extras?.result_codes?.operations?.join(', ') ??
    (raw as any)?.response?.data?.detail ??
    raw ??
    '',
  ).toLowerCase();

  if (!msg.trim()) return 'Could not complete the payment. Please try again.';

  if (msg.includes('user denied') || msg.includes('user rejected') || msg.includes('cancel')) {
    return 'Payment cancelled in your wallet.';
  }
  if (msg.includes('op_no_destination') || msg.includes('no_destination')) {
    return 'Weave’s treasury is not active on this Stellar network yet. Our team must fund the receive address on mainnet before wallet pay-in works.';
  }
  if (msg.includes('op_no_trust') || msg.includes('trustline')) {
    return 'Your wallet needs a USDC trustline on this network. Add USDC in Freighter (Assets → Add), then try again.';
  }
  if (msg.includes('op_underfunded') || msg.includes('underfunded') || msg.includes('insufficient')) {
    return 'Not enough USDC or XLM for fees in this wallet. Fund the account and try again.';
  }
  if (msg.includes('op_line_full')) {
    return 'This wallet cannot receive more USDC right now. Try another wallet or contact support.';
  }
  if (msg.includes('wrong network') || msg.includes('network passphrase')) {
    return 'Your wallet is on the wrong network. Switch to Stellar testnet (or mainnet) to match this checkout.';
  }
  if (msg.includes('not connected') || (msg.includes('freighter') && msg.includes('install'))) {
    return 'Could not open your Stellar wallet. Use a normal browser window (not private), allow the extension on this site, and pick Freighter again.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'The network took too long to respond. Check your connection and try again.';
  }
  if (msg.includes('memo')) {
    return 'This payment requires a memo. Use the Pay button here so we attach it automatically.';
  }

  return 'Could not complete the payment. Check your wallet balance and network, then try again.';
}
