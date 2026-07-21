import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { requireSession } from '../middleware/auth';
import { sendDeletionRequestEmail } from '../services/email.service';
import { syncPaystackSubaccount, schedulePaystackSyncRetry } from '../lib/merchant';
import { webhookService, WEBHOOK_MAX_ATTEMPTS, isSafeWebhookUrl } from '../services/webhook.service';
import { paystack } from '../services/paystack.service';
import { recordMerchantAudit, isPlatformAdmin } from '../services/audit.service';
import { deviceTypeFromUA } from '../lib/user-agent';

const router = Router();

function generatePublishableKey(sandbox = false): string {
  return (sandbox ? 'pk_test_' : 'pk_live_') + crypto.randomBytes(24).toString('hex');
}

function generateSecretKey(sandbox = false): string {
  return (sandbox ? 'sk_test_' : 'sk_live_') + crypto.randomBytes(32).toString('hex');
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// GET /api/v1/merchant/keys
// Returns the merchant's publishable key and metadata. Never returns the secret key.
router.get('/keys', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    return res.json({
      success: true,
      data: {
        merchantId:           merchant.id,
        name:                 merchant.name,
        publishableKey:       merchant.publishableKey,
        sandboxPublishableKey: merchant.sandboxPublishableKey ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/keys/regenerate
// Generates a new publishable + secret key pair. The secret key is returned
// exactly once and then discarded — the merchant must store it immediately.
// Body: { mode?: 'live' | 'sandbox' } (default 'live'). Sandbox rotates the
// pk_test_/sk_test_ pair so backend/SDK integrations can authenticate in sandbox.
router.post('/keys/regenerate', requireSession, async (req, res) => {
  try {
    const mode = req.body?.mode === 'sandbox' ? 'sandbox' : 'live';
    const sandbox = mode === 'sandbox';

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    const publishableKey = generatePublishableKey(sandbox);
    const secretKey      = generateSecretKey(sandbox);
    const hashedSecret   = hashSecret(secretKey);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deactivate previous keypairs of the SAME mode only, so rotating live
      // keys never disturbs the sandbox pair and vice-versa.
      await tx.keyPair.updateMany({
        where: { merchantId: merchant.id, isActive: true, isSandbox: sandbox },
        data:  { isActive: false },
      });
      await tx.keyPair.create({
        data: {
          publicKey:       publishableKey,
          hashedSecretKey: hashedSecret,
          merchantId:      merchant.id,
          isActive:        true,
          isSandbox:       sandbox,
        },
      });
      // Keep the merchant's matching publishable key in sync with the new pair.
      await tx.merchant.update({
        where: { id: merchant.id },
        data:  sandbox ? { sandboxPublishableKey: publishableKey } : { publishableKey },
      });
    });

    recordMerchantAudit(req, 'key.regenerated', { metadata: { mode } });

    return res.json({
      success: true,
      data: {
        merchantId:     merchant.id,
        mode,
        publishableKey,
        secretKey, // shown exactly once
        warning:  'Store the secretKey now — it will not be shown again.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/profile
router.get('/profile', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    return res.json({
      success: true,
      data: {
        id:                    merchant.id,
        email:                 merchant.email,
        name:                  merchant.name,
        kycLevel:              merchant.kycLevel,
        emailVerifiedAt:       merchant.emailVerifiedAt,
        createdAt:             merchant.createdAt,
        publishableKey:        merchant.publishableKey ?? null,
        sandboxPublishableKey: merchant.sandboxPublishableKey ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/merchant/profile
router.patch('/profile', requireSession, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  if (name.length > 100) return res.status(400).json({ success: false, error: 'name must be under 100 characters' });

  try {
    const merchant = await prisma.merchant.update({
      where: { id: req.merchantId },
      data:  { name },
    });

    recordMerchantAudit(req, 'profile.updated', { metadata: { name } });

    // Mirror to Paystack (async). On failure, kick off a backoff-retry chain so a
    // transient error doesn't leave the merchant stuck at FAILED until checkout.
    syncPaystackSubaccount(merchant.id).catch(() => schedulePaystackSyncRetry({ merchantId: merchant.id, attempt: 1 }));

    return res.json({
      success: true,
      data: {
        id:        merchant.id,
        email:     merchant.email,
        name:      merchant.name,
        kycLevel:  merchant.kycLevel,
        createdAt: merchant.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/payouts
// Fetches the currently configured default payout destination for this merchant
router.get('/payouts', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchantId },
    });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    if (!merchant.defaultPayoutInstrumentId) {
      return res.json({ success: true, data: null });
    }

    const inst = await prisma.instrument.findUnique({
      where: { id: merchant.defaultPayoutInstrumentId },
    });

    if (!inst) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        id:                          inst.id,
        kind:                        inst.kind,
        assetKey:                    inst.assetKey,
        bankInstitution:             inst.bankInstitution,
        bankAccountIdentifier:       inst.bankAccountIdentifier,
        bankAccountName:             inst.bankAccountName,
        walletAddress:               inst.walletAddress,
        paystackSubaccountStatus:    merchant.paystackSubaccountStatus,
        paystackSubaccountCode:      merchant.paystackSubaccountCode,
        paystackSubaccountSyncedAt:  merchant.paystackSubaccountSyncedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/payouts/resolve-account
// Resolves a bank account name via Paystack — same chain used by syncPaystackSubaccount
// so the name shown in the form matches exactly what ends up on the Paystack subaccount.
router.post('/payouts/resolve-account', requireSession, async (req, res) => {
  try {
    const { accountNumber, institution } = req.body;
    if (!accountNumber || !institution) {
      return res.status(400).json({ success: false, error: 'accountNumber and institution are required' });
    }
    const bankCode = await paystack.resolveBankCode(String(institution));
    const resolved = await paystack.resolveAccount(String(accountNumber), bankCode);
    return res.json({ success: true, data: resolved.account_name });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/payouts/settlements
// Returns historical settlements from Paystack for this merchant's subaccount
router.get('/payouts/settlements', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchantId },
    });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    if (!merchant.paystackSubaccountCode) {
      return res.json({ success: true, data: [] });
    }

    const settlements = await paystack.getSettlements(merchant.paystackSubaccountCode);
    return res.json({
      success: true,
      data: settlements,
    });
  } catch (err: any) {
    console.error('Fetch settlements error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/merchant/payouts
// Sets a new default payout destination. If one exists, it replaces the linkage.
router.put('/payouts', requireSession, async (req, res) => {
  try {
    const { kind, assetKey, bankInstitution, bankAccountIdentifier, bankAccountName, walletAddress } = req.body;

    if (!kind || !['bank_account', 'crypto_wallet'].includes(kind)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing kind' });
    }
    if (!assetKey || typeof assetKey !== 'string' || assetKey.length > 20) {
      return res.status(400).json({ success: false, error: 'Invalid assetKey' });
    }

    if (kind === 'bank_account' && (!bankInstitution || !bankAccountIdentifier || !bankAccountName)) {
      return res.status(400).json({ success: false, error: 'bankInstitution, bankAccountIdentifier, and bankAccountName are required for bank accounts' });
    }
    if (kind === 'bank_account') {
      if (bankAccountName.length > 200) return res.status(400).json({ success: false, error: 'bankAccountName too long' });
      if (bankAccountIdentifier.length > 50) return res.status(400).json({ success: false, error: 'bankAccountIdentifier too long' });
    }
    if (kind === 'crypto_wallet' && (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length > 128)) {
      return res.status(400).json({ success: false, error: 'Invalid walletAddress' });
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    // We create a new instrument and link it.
    // Over time, old instruments stick around structurally so orders don't break their relationships.
    const newInst = await prisma.instrument.create({
      data: {
        merchantId:            merchant.id,
        kind,
        assetKey,
        bankInstitution:       kind === 'bank_account' ? bankInstitution : null,
        bankAccountIdentifier: kind === 'bank_account' ? bankAccountIdentifier : null,
        bankAccountName:       kind === 'bank_account' ? bankAccountName : null,
        walletAddress:         kind === 'crypto_wallet' ? walletAddress : null,
        label:                 'Default Payout',
        verifiedAt:            new Date(), // we assume merchant enters correct data for now
      },
    });

    await prisma.merchant.update({
      where: { id: merchant.id },
      data:  { defaultPayoutInstrumentId: newInst.id },
    });

    // Audit the most sensitive account change: where the money goes. Store only
    // non-sensitive identifiers (bank name + masked tail), never the full number.
    recordMerchantAudit(req, 'payout.updated', {
      targetType: 'instrument',
      targetId: newInst.id,
      metadata: {
        kind,
        assetKey,
        bankInstitution: kind === 'bank_account' ? bankInstitution : undefined,
        accountLast4: kind === 'bank_account' ? String(bankAccountIdentifier).slice(-4) : undefined,
        walletTail: kind === 'crypto_wallet' ? String(walletAddress).slice(-6) : undefined,
      },
    });

    // Mirror to Paystack (async). On failure, kick off a backoff-retry chain so a
    // transient error doesn't leave the merchant stuck at FAILED until checkout.
    syncPaystackSubaccount(merchant.id).catch(() => schedulePaystackSyncRetry({ merchantId: merchant.id, attempt: 1 }));

    return res.json({
      success: true,
      data: {
        id:                    newInst.id,
        kind:                  newInst.kind,
        assetKey:              newInst.assetKey,
        bankInstitution:       newInst.bankInstitution,
        bankAccountIdentifier: newInst.bankAccountIdentifier,
        bankAccountName:       newInst.bankAccountName,
        walletAddress:         newInst.walletAddress,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/webhook
router.get('/webhook', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });
    return res.json({
      success: true,
      data: {
        url:       merchant.webhookUrl ?? null,
        hasSecret: !!merchant.webhookSecret,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/merchant/webhook — update the endpoint URL
router.patch('/webhook', requireSession, async (req, res) => {
  const raw = req.body?.url;
  const url  = raw === '' || raw === null ? null : String(raw ?? '').trim();

  if (url !== null) {
    // Basic URL validation — must be https or http
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      return res.status(400).json({ success: false, error: 'url must be a valid http/https URL' });
    }
    if (url.length > 512) return res.status(400).json({ success: false, error: 'url too long' });
  }

  try {
    await prisma.merchant.update({ where: { id: req.merchantId }, data: { webhookUrl: url } });
    recordMerchantAudit(req, 'webhook.config_updated', {
      targetType: 'webhook',
      metadata: { url: url ?? null },
    });
    return res.json({ success: true, data: { url } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/webhook/test — send a signed test event to the configured endpoint
router.post('/webhook/test', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });
    if (!merchant.webhookUrl) return res.status(400).json({ success: false, error: 'no webhook URL configured' });
    // Same SSRF guard the real dispatcher enforces — a test send must not be a
    // path to probe loopback/internal hosts.
    if (!isSafeWebhookUrl(merchant.webhookUrl)) {
      return res.status(400).json({ success: false, error: 'Webhook URL must be a public HTTPS address' });
    }

    const payload = {
      event: 'order.completed' as const,
      data: {
        id:              'test_' + crypto.randomBytes(8).toString('hex'),
        reference:       null,
        status:          'completed',
        sourceAssetKey:  'crypto:BASE:USDC',
        destAssetKey:    'fiat:NGN',
        sourceAmount:    10,
        destAmount:      16000,
        createdAt:       new Date().toISOString(),
      },
    };
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const headers: Record<string, string> = {
      'Content-Type':      'application/json',
      'X-Weave-Timestamp': timestamp,
      'X-Weave-Event':     payload.event,
    };

    if (merchant.webhookSecret) {
      const sig = crypto
        .createHmac('sha256', merchant.webhookSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex');
      headers['X-Weave-Signature'] = `sha256=${sig}`;
    }

    const result = await fetch(merchant.webhookUrl, { method: 'POST', headers, body });
    return res.json({ success: true, data: { status: result.status, ok: result.ok } });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message ?? 'delivery failed' });
  }
});

// POST /api/v1/merchant/webhook/secret — rotate the signing secret (shown exactly once)
router.post('/webhook/secret', requireSession, async (req, res) => {
  try {
    const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');
    await prisma.merchant.update({ where: { id: req.merchantId }, data: { webhookSecret: secret } });
    recordMerchantAudit(req, 'webhook.secret_rotated', { targetType: 'webhook' });
    return res.json({
      success: true,
      data: { secret, warning: 'Store this secret now — it will not be shown again.' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Shape a WebhookDelivery row for the dashboard. Includes full request/response
// bodies so the detail slide-over can render them without a second round-trip.
function serializeDelivery(d: any) {
  return {
    id:         d.id,
    event:      d.event,
    url:        d.url,
    status:     d.status,               // 'success' | 'failed' | 'retrying'
    statusCode: d.statusCode ?? null,
    attempts:   d.attempts,
    maxAttempts: WEBHOOK_MAX_ATTEMPTS,
    orderId:    d.orderId ?? null,
    payload:    d.payload ?? null,
    response:   d.response ?? null,
    createdAt:  d.createdAt,
    updatedAt:  d.updatedAt,
  };
}

// GET /api/v1/merchant/webhook/deliveries — recent outgoing webhook deliveries
router.get('/webhook/deliveries', requireSession, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const deliveries = await prisma.webhookDelivery.findMany({
      where:   { merchantId: req.merchantId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
    return res.json({ success: true, data: deliveries.map(serializeDelivery) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/webhook/deliveries/:id/resend — manually re-send a delivery
router.post('/webhook/deliveries/:id/resend', requireSession, async (req, res) => {
  try {
    const updated = await webhookService.resend(req.params.id, req.merchantId);
    if (updated === 'no_endpoint') {
      return res.status(400).json({ success: false, error: 'No webhook endpoint is configured. Add one under Settings → Webhooks first.' });
    }
    if (!updated) return res.status(404).json({ success: false, error: 'delivery not found' });
    return res.json({ success: true, data: serializeDelivery(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/audit-events — this merchant's own activity log.
// Newest first, capped. Optional `?before=<ISO>` for simple cursor pagination.
router.get('/audit-events', requireSession, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(String(req.query.before)) : null;

    const events = await prisma.auditEvent.findMany({
      where: {
        merchantId: req.merchantId,
        ...(before && !isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      // Deliberately omit `ip`/`userAgent` from the merchant-facing view — those
      // are for internal security review, not the merchant's own activity feed.
      select: {
        id: true,
        action: true,
        actorType: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: events });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/audit-events/all — platform-wide audit log.
// Restricted to platform-admin merchants (Dewdrop Labs). Returns full detail
// (which merchant, IP, user-agent) that the self-serve merchant view omits,
// plus optional filtering by action / merchantId.
router.get('/audit-events/all', requireSession, async (req, res) => {
  try {
    if (!isPlatformAdmin(req.merchant?.email)) {
      // Same 404 shape a non-existent route would give — don't advertise the
      // endpoint's existence to non-admin merchants.
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const action = req.query.action ? String(req.query.action) : null;
    const merchantId = req.query.merchantId ? String(req.query.merchantId) : null;

    const events = await prisma.auditEvent.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(merchantId ? { merchantId } : {}),
        ...(before && !isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Attach merchant identity for readability. Batch-fetch (no FK relation on
    // AuditEvent by design), map, and tolerate null/deleted merchants.
    const ids = [...new Set(events.map((e) => e.merchantId).filter(Boolean))] as string[];
    const merchants = ids.length
      ? await prisma.merchant.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } })
      : [];
    const byId = new Map(merchants.map((m) => [m.id, m]));

    const data = events.map((e) => ({
      ...e,
      merchant: e.merchantId ? byId.get(e.merchantId) ?? null : null,
      device: deviceTypeFromUA(e.userAgent),
    }));

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/request-deletion
// Submits an account deletion request to the admin support team
router.post('/request-deletion', requireSession, async (req, res) => {
  try {
    const { reason } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    await sendDeletionRequestEmail(merchant.id, merchant.email, merchant.name, reason || '');

    recordMerchantAudit(req, 'merchant.deletion_requested', {
      metadata: { reason: reason ? String(reason).slice(0, 500) : null },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
