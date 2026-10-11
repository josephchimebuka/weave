// Sandbox-only conveniences. Every handler requires SANDBOX credentials
// (pk_test_/sk_test_ → req.sandboxMode) and refuses live ones outright.
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { stellarSimulator } from '../services/stellar-simulator.service';
import { recordMerchantAudit } from '../services/audit.service';

const router = Router();

const FAUCET_MAX_USDC = Number(process.env.SANDBOX_FAUCET_MAX_USDC ?? 50);

// POST /api/v1/sandbox/stellar-faucet { to, amount }
// Drops testnet USDC from the simulator into a wallet. Exists so sandbox
// integrations can emulate a *third-party* on-ramp settling into the user's
// wallet (e.g. a mocked BOB purchase) — the Stellar-testnet equivalent of a
// test card. Play money only.
router.post('/stellar-faucet', requireAuth, async (req, res) => {
  if (!req.sandboxMode) return res.status(403).json({ success: false, error: 'Sandbox credentials required' });
  if (!stellarSimulator.enabled) return res.status(503).json({ success: false, error: 'Sandbox Stellar simulator is not configured' });
  const to = String(req.body?.to ?? '');
  const amount = Number(req.body?.amount);
  if (!/^G[A-Z2-7]{55}$/.test(to)) return res.status(400).json({ success: false, error: 'to must be a Stellar G-address' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > FAUCET_MAX_USDC) {
    return res.status(400).json({ success: false, error: `amount must be between 0 and ${FAUCET_MAX_USDC} USDC` });
  }
  try {
    const txHash = await stellarSimulator.payUsdc(true, { to, amount, memo: 'wv-sbx-faucet' });
    recordMerchantAudit(req, 'sandbox.stellar_faucet', { targetType: 'stellar_account', targetId: to, metadata: { amount, txHash, network: 'testnet' } });
    res.json({ success: true, data: { txHash, amount, network: 'testnet', simulated: true } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/v1/sandbox/stellar-simulator — where sandbox cash-outs are paid to, and its balance.
router.get('/stellar-simulator', requireAuth, async (req, res) => {
  if (!req.sandboxMode) return res.status(403).json({ success: false, error: 'Sandbox credentials required' });
  if (!stellarSimulator.enabled) return res.status(503).json({ success: false, error: 'Sandbox Stellar simulator is not configured' });
  try {
    res.json({ success: true, data: { address: stellarSimulator.publicKey(true), usdcBalance: await stellarSimulator.balance(true), network: 'testnet', simulated: true } });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
