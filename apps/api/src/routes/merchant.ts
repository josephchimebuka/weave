import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { requireSession } from '../middleware/auth';
import { sendDeletionRequestEmail } from '../services/email.service';
import { syncPaystackSubaccount, schedulePaystackSyncRetry } from '../lib/merchant';
import { webhookService, WEBHOOK_MAX_ATTEMPTS, isSafeWebhookUrl } from '../services/webhook.service';
import { paycrest } from '../services/paycrest.service';
import { bachs } from '../services/bachs.service';
import { anchor } from '../services/anchor.service';
import { ensureBachsPayoutDestination } from '../services/executor.service';
import { BACHS_ENABLED, ANCHOR_ENABLED } from '../lib/flags';
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

    // Whether the newer business-profile fields are filled — drives the dashboard
    // nudge for already-verified merchants who submitted KYB before they existed.
    const kyb = await prisma.businessVerification.findUnique({
      where:  { merchantId: req.merchantId },
      select: { websiteUrl: true, productDescription: true, supportEmail: true, productCategory: true },
    });
    const filled = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
    const businessProfileComplete = !!(kyb && filled(kyb.websiteUrl) && filled(kyb.productDescription) && filled(kyb.supportEmail) && filled(kyb.productCategory));

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
        businessProfileComplete,
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
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/payouts/ledger
// A rail-agnostic ledger of every naira payout that reached (or is reaching) the
// merchant's bank: Bachs collections (collect→split→withdraw), historical Paystack
// naira settlements, and Paycrest crypto→naira offramps all land here. Bachs orders
// carry their live payout state (processing/paid/blocked); other rails derive status
// from the order itself (completed = paid). Derived from Order rows — no live call.
// Scoped to the caller's sandbox/live world.
router.get('/payouts/ledger', requireSession, async (req, res) => {
  try {
    const feeBps = Number(process.env.SENDER_FEE_BPS ?? 75) + Number(process.env.APP_FEE_BPS ?? 10);
    const holdSeconds = Number(process.env.BACHS_PAYOUT_HOLD_S ?? 0);
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Every order that settles naira to the merchant — regardless of rail.
    const orders = await prisma.order.findMany({
      where: {
        merchantId: req.merchantId,
        sandboxMode: !!req.sandboxMode,
        destAssetKey: 'fiat:NGN',
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,   // summary + list both derive from this; naira orders per merchant stay well under this ceiling
      select: {
        id: true, reference: true, sourceAmount: true, destAmount: true, customer: true,
        status: true, bachsPayoutStatus: true, bachsPayoutAt: true, bachsSplitAt: true, updatedAt: true,
      },
    });

    const items = orders.map((o) => {
      const isBachs = o.bachsPayoutStatus != null;
      const gross = Number(o.sourceAmount ?? 0);
      // Net naira to the merchant. Use the settled amount when we have it. Before it
      // settles: for Bachs (naira-in) the gross IS naira, so derive the net; for a
      // crypto→naira offramp the gross is a CRYPTO amount (not naira), so we don't yet
      // know the naira figure — show 0 rather than mislabel the crypto number as ₦.
      const amountNgn = o.destAmount != null
        ? round2(Number(o.destAmount))
        : isBachs ? round2(gross * (1 - feeBps / 10000)) : 0;

      // Bachs orders carry a live payout state; other rails map from order status.
      const status = isBachs
        ? (o.bachsPayoutStatus === 'pending' ? 'processing' : o.bachsPayoutStatus)
        : o.status === 'completed' ? 'paid'
        : o.status === 'failed'    ? 'failed'
        : o.status === 'refunded'  ? 'refunded'
        : 'processing';

      return {
        orderId:   o.id,
        reference: o.reference ?? null,
        customer:  (o.customer as any)?.name ?? null,
        amountNgn,
        status,
        at:        (o.bachsPayoutAt ?? o.bachsSplitAt ?? o.updatedAt),
      };
    });

    const sumWhere = (pred: (s: string | null) => boolean) =>
      round2(items.filter((i) => pred(i.status)).reduce((a, i) => a + i.amountNgn, 0));

    // Destination bank (the merchant's own payout account) for confirmation in the UI.
    let destination: { bank: string; accountLast4: string } | null = null;
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (merchant?.defaultPayoutInstrumentId) {
      const inst = await prisma.instrument.findUnique({ where: { id: merchant.defaultPayoutInstrumentId } });
      if (inst?.kind === 'bank_account' && inst.bankAccountIdentifier) {
        let bankName = inst.bankInstitution ?? '';
        try {
          const insts = await paycrest.getInstitutions('NGN');
          bankName = insts.find((b) => b.code === inst.bankInstitution)?.name ?? bankName;
        } catch { /* fall back to the raw code */ }
        destination = { bank: bankName, accountLast4: inst.bankAccountIdentifier.slice(-4) };
      }
    }

    return res.json({
      success: true,
      data: {
        summary: {
          processingNgn: sumWhere((s) => s === 'processing'),
          paidNgn:       sumWhere((s) => s === 'paid'),
          blockedCount:  items.filter((i) => i.status === 'blocked').length,
          failedCount:   items.filter((i) => i.status === 'failed').length,
          holdSeconds,
          destination,
        },
        items,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/payouts/resolve-account
// Resolves a bank account name via Paycrest /verify-account. The `institution` code comes
// straight from Paycrest's /institutions list (same source the form's bank dropdown uses),
// so it maps 1:1 to the offramp rail these NGN payouts actually settle through.
router.post('/payouts/resolve-account', requireSession, async (req, res) => {
  try {
    const { accountNumber, institution } = req.body;
    if (!accountNumber || !institution) {
      return res.status(400).json({ success: false, error: 'accountNumber and institution are required' });
    }
    const accountName = await paycrest.verifyAccount({
      institution: String(institution),
      accountIdentifier: String(accountNumber),
      currency: 'NGN',
    });
    return res.json({ success: true, data: accountName });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: err.message });
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

// ── Merchant brand (themes the hosted cash-out page) ────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const BRAND_FONTS = ['system', 'sans', 'grotesk', 'poppins', 'rounded', 'dmsans', 'serif', 'playfair', 'fraunces', 'mono'];

// Whitelist + validate brand fields — never spread req.body into the JSON blob.
function sanitizeBrand(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const b = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : undefined);
  const url = (v: unknown) => {
    const s = str(v, 2048);
    if (!s) return undefined;
    try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? s : undefined; } catch { return undefined; }
  };
  const logoUrl     = url(b.logoUrl);        if (logoUrl)     out.logoUrl = logoUrl;
  const bgImageUrl  = url(b.bgImageUrl);      if (bgImageUrl)  out.bgImageUrl = bgImageUrl;
  const displayName = str(b.displayName, 80); if (displayName) out.displayName = displayName;
  const headline    = str(b.headline, 120);   if (headline)    out.headline = headline;
  const subheadline = str(b.subheadline, 200); if (subheadline) out.subheadline = subheadline;
  if (typeof b.accentColor === 'string' && HEX_RE.test(b.accentColor)) out.accentColor = b.accentColor;
  if (typeof b.bgColor === 'string' && HEX_RE.test(b.bgColor)) out.bgColor = b.bgColor;
  if (typeof b.font === 'string' && BRAND_FONTS.includes(b.font)) out.font = b.font;
  return out;
}

// GET /api/v1/merchant/brand
router.get('/brand', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId }, select: { brand: true } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });
    return res.json({ success: true, data: merchant.brand ?? {} });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/merchant/brand — replace the brand profile with a validated set.
router.patch('/brand', requireSession, async (req, res) => {
  try {
    const brand = sanitizeBrand(req.body);
    await prisma.merchant.update({ where: { id: req.merchantId }, data: { brand } });
    recordMerchantAudit(req, 'brand.updated', { metadata: { fields: Object.keys(brand) } });
    return res.json({ success: true, data: brand });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Bachs Connect onboarding ────────────────────────────────────────────────
// A merchant becomes a Bachs "connected account" so their naira collections
// settle to THEIR account (Bachs is the licensed party; Dewdrop never holds the
// funds). Onboarding: create the connected account once, then send the merchant
// through a hosted account-link. `transfers` must be active before they can
// collect naira — the executor gates on it.

function dashboardBaseUrl(): string {
  return (process.env.DASHBOARD_URL || 'http://localhost:3001').replace(/\/$/, '');
}

// Which Bachs environment onboarding uses. In production, always LIVE (real
// merchants). Outside production, use the Bachs SANDBOX when a sandbox key is
// configured — so local/staging can exercise Connect onboarding without a live key.
function bachsOnboardSandbox(): boolean {
  return process.env.NODE_ENV !== 'production' && bachs.hasTestKeys();
}

// Set a value at a dotted path, creating arrays for numeric segments —
// turns Bachs's flat field_keys ("persons.0.first_name") into the nested `data`
// object its /requirements/submit expects.
function setPath(root: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.');
  let node: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (node[key] == null) node[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}

// Map a Bachs checklist field_key → the value we already hold in Weave's KYB
// (BusinessVerification). Best-effort: keys not covered here surface to the
// merchant as "remaining", so a mapping gap degrades gracefully instead of
// stalling. NOTE: Bachs's sandbox requires ~no KYC, so the exact live field_keys
// couldn't be verified here — refine these against the live checklist at cutover.
function kybValueFor(fieldKey: string, kyb: any): unknown {
  const person = fieldKey.replace(/^persons\.\d+\./, 'person.');
  switch (person) {
    case 'person.first_name':                return kyb.firstName || undefined;
    case 'person.last_name':                 return kyb.lastName || undefined;
    case 'person.dob':
    case 'person.date_of_birth':             return kyb.dob || undefined;
    case 'person.relationship.representative': return kyb.firstName ? true : undefined;
    case 'person.address':
    case 'person.address.line1':             return kyb.personalAddress || undefined;
  }
  switch (fieldKey) {
    case 'business.legal_name':
    case 'business.name':
    case 'company.legal_name':               return kyb.legalName || undefined;
    case 'business.trading_name':
    case 'business.dba':                     return kyb.dba || undefined;
    case 'business.registration_number':
    case 'company.registration_number':      return kyb.regNumber || undefined;
    case 'business.address.line1':           return kyb.businessAddress || undefined;
    case 'business.address.city':            return kyb.city || undefined;
    case 'business.address.state':           return kyb.state || undefined;
    case 'business.address.postal_code':     return kyb.postalCode || undefined;
    // Bachs business_profile.* (collection capabilities) — now collected in our KYB.
    case 'business_profile.url':                 return kyb.websiteUrl || undefined;
    case 'business_profile.product_description': return kyb.productDescription || undefined;
    case 'business_profile.support_email':       return kyb.supportEmail || undefined;
    case 'business_profile.product_category':    return kyb.productCategory || undefined;
    case 'business_profile.social_media':        return kyb.socialMedia || undefined;
  }
  return undefined;
}

async function refreshBachsCapabilities(merchant: any, accountId: string, sandbox: boolean) {
  const caps = await bachs.getCapabilities(accountId, { sandbox }).catch(() => [] as any[]);
  const find = (n: string) => caps.find((c: any) => c.name === n)?.status;
  // DIRECT-CHARGE model: the naira-collection capability (merchant persona) gates
  // order creation — active if EITHER naira method is enabled. `payouts` (recipient)
  // lets the merchant withdraw its own balance. `transfers` is legacy (split model).
  const paymentsStatus  = (find('ngn_card_collection') === 'active' || find('bank_transfer') === 'active')
                            ? 'active'
                            : (find('ngn_card_collection') ?? find('bank_transfer') ?? merchant.bachsPaymentsStatus ?? 'restricted');
  const payoutsStatus   = find('payouts')   ?? merchant.bachsPayoutsStatus   ?? 'restricted';
  const transfersStatus = find('transfers') ?? merchant.bachsTransfersStatus ?? 'restricted';
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      bachsPaymentsStatus:  paymentsStatus,
      bachsPayoutsStatus:   payoutsStatus,
      bachsTransfersStatus: transfersStatus,
      ...(paymentsStatus === 'active' && !merchant.bachsOnboardedAt ? { bachsOnboardedAt: new Date() } : {}),
    },
  });
  return { paymentsStatus, payoutsStatus, transfersStatus };
}

function remainingFields(checklist: any) {
  return (checklist.checklist ?? [])
    .filter((f: any) => f.state === 'currently_due')
    .map((f: any) => ({ fieldKey: f.field_key, label: f.label, group: f.group, error: f.error_reason ?? null }));
}

// POST /api/v1/merchant/bachs/connect
// Checklist-driven onboarding: ensure the connected account exists, then relay the
// merchant's EXISTING Weave KYB into Bachs's requirements — so they don't re-enter
// what we already have. Returns any fields Bachs still needs (the delta) for the
// dashboard to prompt. No hosted redirect. Idempotent.
router.post('/bachs/connect', requireSession, async (req, res) => {
  if (!BACHS_ENABLED) {
    return res.status(503).json({ success: false, error: 'Naira payouts are not currently available.' });
  }
  try {
    const sandbox = bachsOnboardSandbox();
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    // 1. Ensure the connected account.
    let accountId = merchant.bachsConnectedAccountId;
    if (!accountId) {
      const account = await bachs.createConnectedAccount(
        { contactEmail: merchant.email, displayName: merchant.name, country: 'NG' },
        { sandbox },
      );
      accountId = account.id;
      await prisma.merchant.update({ where: { id: merchant.id }, data: { bachsConnectedAccountId: accountId } });
      recordMerchantAudit(req, 'bachs.connected_account.created', { metadata: { accountId } });
    }

    // 2. Read Bachs's checklist. In the split-payments vendor model the account
    //    requests only `transfers` + `payouts`, so the single field Bachs asks of a
    //    connected account is `payout_destination`. It is satisfied by REGISTERING the
    //    merchant's bank as a payout destination (POST /payouts/destinations) — NOT via
    //    requirements/submit, whose live schema rejects the documented {country,data}
    //    body. Both verified against live. (business_profile/persons fields belong to
    //    the COLLECTION capabilities, which the platform org holds, not the vendor.)
    let checklist = await bachs.getRequirementsChecklist(accountId, { sandbox });
    const dueKeys = new Set<string>([
      ...(checklist.checklist ?? []).filter((f: any) => f.state === 'currently_due').map((f: any) => f.field_key),
      ...(checklist.capabilities ?? []).flatMap((c: any) =>
        (c.fields ?? []).filter((f: any) => f.state === 'currently_due').map((f: any) => f.field_key)),
    ]);
    if (dueKeys.has('payout_destination')) {
      try {
        await ensureBachsPayoutDestination(
          { id: merchant.id, bachsConnectedAccountId: accountId, bachsPayoutDestinationId: merchant.bachsPayoutDestinationId },
          { sandbox },
        );
        checklist = await bachs.getRequirementsChecklist(accountId, { sandbox });
      } catch (err: any) {
        // No usable NGN bank yet (or it couldn't be verified) — leave payout_destination
        // in the `remaining` set so the dashboard prompts the merchant to add their bank.
        console.warn('[merchant] bachs payout destination not set during connect:', err.message);
      }
    }

    // 4. Refresh capability status + compute the remaining delta.
    const { paymentsStatus, payoutsStatus, transfersStatus } = await refreshBachsCapabilities(merchant, accountId, sandbox);

    return res.json({
      success: true,
      data: {
        connectedAccountId: accountId,
        setupStatus: checklist.setup_status,   // "complete" | "incomplete"
        paymentsStatus,   // naira collection capability (gates order creation)
        payoutsStatus,
        transfersStatus,  // legacy (split model)
        remaining: remainingFields(checklist),  // fields Bachs still needs from the merchant
      },
    });
  } catch (err: any) {
    console.error('[merchant] bachs connect failed:', err.message);
    return res.status(502).json({ success: false, error: 'Could not set up payouts. Please try again.' });
  }
});

// POST /api/v1/merchant/bachs/onboarding/submit
// Merchant supplies the remaining delta fields (the ones our KYB didn't cover),
// filled in the dashboard. Whitelisted to field_keys Bachs currently marks due.
router.post('/bachs/onboarding/submit', requireSession, async (req, res) => {
  if (!BACHS_ENABLED) return res.status(503).json({ success: false, error: 'Naira payouts are not currently available.' });
  try {
    const sandbox = bachsOnboardSandbox();
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant?.bachsConnectedAccountId) return res.status(400).json({ success: false, error: 'Connect payouts first.' });
    const accountId = merchant.bachsConnectedAccountId;

    const checklist = await bachs.getRequirementsChecklist(accountId, { sandbox });
    const dueKeys = new Set((checklist.checklist ?? []).filter((f: any) => f.state === 'currently_due').map((f: any) => f.field_key));

    const incoming = (req.body?.data && typeof req.body.data === 'object') ? req.body.data as Record<string, unknown> : {};
    const data: Record<string, any> = {};
    let filled = 0;
    for (const [k, v] of Object.entries(incoming)) {
      if (dueKeys.has(k) && v !== undefined && v !== null && v !== '') { setPath(data, k, v); filled++; }
    }
    if (filled === 0) return res.status(400).json({ success: false, error: 'No valid fields to submit.' });

    const result = await bachs.submitRequirements(accountId, { country: 'NG', draft: false, data }, { sandbox });
    const fresh = await bachs.getRequirementsChecklist(accountId, { sandbox });
    const { paymentsStatus, payoutsStatus, transfersStatus } = await refreshBachsCapabilities(merchant, accountId, sandbox);

    // Audit the KYB-data submission to the payment processor (metadata is PII-free:
    // count + resulting setup status only, never the submitted field values).
    recordMerchantAudit(req, 'bachs.requirements.submitted', {
      targetType: 'connected_account', targetId: accountId,
      metadata: { fields: filled, setupStatus: fresh.setup_status },
    });

    return res.json({
      success: true,
      data: { setupStatus: fresh.setup_status, paymentsStatus, payoutsStatus, transfersStatus, remaining: remainingFields(fresh), errors: result.errors ?? [] },
    });
  } catch (err: any) {
    console.error('[merchant] bachs onboarding submit failed:', err.message);
    return res.status(502).json({ success: false, error: 'Could not submit onboarding details. Please try again.' });
  }
});

// GET /api/v1/merchant/bachs/status
// Returns cached capability status, and best-effort refreshes from Bachs so the
// dashboard reflects reality even if a `capability.updated` webhook was missed.
router.get('/bachs/status', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    let paymentsStatus  = merchant.bachsPaymentsStatus ?? null;
    let payoutsStatus   = merchant.bachsPayoutsStatus ?? null;

    if (BACHS_ENABLED && merchant.bachsConnectedAccountId) {
      try {
        const caps = await bachs.getCapabilities(merchant.bachsConnectedAccountId, { sandbox: bachsOnboardSandbox() });
        const find = (n: string) => caps.find(c => c.name === n)?.status ?? null;
        // Direct-charge model: naira collection = the merchant persona capability
        // (active if EITHER naira method is enabled); payouts lets the merchant
        // withdraw its own balance.
        const pay = (find('ngn_card_collection') === 'active' || find('bank_transfer') === 'active')
                      ? 'active'
                      : (find('ngn_card_collection') ?? find('bank_transfer'));
        const p = find('payouts');
        if ((pay && pay !== paymentsStatus) || (p && p !== payoutsStatus)) {
          paymentsStatus = pay ?? paymentsStatus;
          payoutsStatus  = p ?? payoutsStatus;
          await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
              ...(pay ? { bachsPaymentsStatus: pay } : {}),
              ...(p ? { bachsPayoutsStatus:   p } : {}),
              ...(pay === 'active' && !merchant.bachsOnboardedAt ? { bachsOnboardedAt: new Date() } : {}),
            },
          });
        }
      } catch (err: any) {
        // Non-fatal — fall back to the cached status.
        console.warn('[merchant] bachs capability refresh failed:', err.message);
      }
    }

    return res.json({
      success: true,
      data: {
        enabled:            BACHS_ENABLED,
        connectedAccountId: merchant.bachsConnectedAccountId ?? null,
        paymentsStatus,
        payoutsStatus,
        canCollectNaira:    paymentsStatus === 'active',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Anchor onboarding (the merchant's own KYB'd naira account) ───────────────
// Unlike Bachs (checklist-driven), Anchor runs real KYB: we create a BusinessCustomer
// from the merchant's Weave KYB, trigger verification, and — once approved (via the
// customer.identification.approved webhook) — create the DepositAccount that naira
// collects into. NOTE: Weave's current KYB does NOT yet collect business BVN, director
// BVN, registration date, or ownership% — Anchor may require these, so KYB can land on
// `awaitingDocument`/`reenter_information` until the KYB form is extended. Best-effort
// mapping degrades gracefully rather than blocking.

function anchorOnboardSandbox(): boolean {
  return process.env.NODE_ENV !== 'production' && anchor.hasTestKeys();
}

/** Normalise an Anchor verification status token to our cached `anchorKybStatus`. */
function mapAnchorVerificationStatus(raw: string | undefined): string {
  switch ((raw || '').toLowerCase()) {
    case 'approved': case 'verified':                return 'approved';
    case 'rejected': case 'declined': case 'error':  return 'rejected';
    case 'manualreview': case 'manual_review':       return 'manualReview';
    case 'awaitingdocument': case 'pending_document':return 'awaitingDocument';
    case 'pending': case 'processing': case 'unverified': return raw?.toLowerCase() === 'unverified' ? 'unverified' : 'pending';
    default: return raw ? 'pending' : 'unverified';
  }
}

// Weave entity types → Anchor `registrationType` enum. Anchor's valid values (confirmed):
// Private_Incorporated, Incorporated_Trustees, Business_Name, Free_Zone, Gov,
// Private_Incorporated_Gov, Cooperative_Society, Public_Incorporated.
const ANCHOR_REG_TYPES = new Set([
  'Private_Incorporated', 'Incorporated_Trustees', 'Business_Name', 'Free_Zone',
  'Gov', 'Private_Incorporated_Gov', 'Cooperative_Society', 'Public_Incorporated',
]);
function anchorRegistrationType(entityType: string | null | undefined): string {
  const et = (entityType || '').trim();
  if (ANCHOR_REG_TYPES.has(et)) return et;             // KYB dropdown now emits canonical values
  switch (et.toLowerCase()) {                          // legacy Weave labels
    case 'sole proprietorship': return 'Business_Name';
    case 'cooperative':         return 'Cooperative_Society';
    case 'llc':
    case 'corporation':
    default:                    return 'Private_Incorporated';
  }
}

// Map Weave's productCategory → Anchor's required `industry` enum (underscore form,
// confirmed accepted in sandbox). Unmapped/blank falls back to ANCHOR_DEFAULT_INDUSTRY
// (override for a specific merchant/business), then a neutral valid default.
const ANCHOR_INDUSTRY_BY_CATEGORY: Record<string, string> = {
  'Retail & E-commerce':         'Commerce_PhysicalGoods',
  'Food & Beverage':             'Hospitality_Restaurants',
  'Fashion & Apparel':           'Commerce_PhysicalGoods',
  'Digital Products & Software': 'Commerce_DigitalGoods',
  'Professional Services':       'Commerce_ProfessionalServices',
  'Health & Beauty':             'Commerce_PhysicalGoods',
  'Education & Training':        'Education_VocationalTraining',
  'Travel & Hospitality':        'Travel_TravelAgencies',
  'Financial Services':          'FinancialServices_CorporateServices',
  'Arts & Entertainment':        'Nonprofits_Leisure_Entertainment',
  'Logistics & Delivery':        'Logistics_CourierServices',
  'Nonprofit':                   'Nonprofits_NGOs',
  'Other':                       'OtherProfessionalServices',
};
function anchorIndustry(kyb?: any): string {
  const pc = kyb?.productCategory ? String(kyb.productCategory).trim() : '';
  // Legacy Weave labels (spaces/&, incl. single-word "Nonprofit"/"Other") map first.
  if (pc && ANCHOR_INDUSTRY_BY_CATEGORY[pc]) return ANCHOR_INDUSTRY_BY_CATEGORY[pc];
  // The KYB dropdown now stores Anchor's canonical industry value directly — pass through.
  if (pc && !/[\s&]/.test(pc)) return pc;
  return process.env.ANCHOR_DEFAULT_INDUSTRY || 'OtherProfessionalServices';
}

// Normalise a Nigerian phone number to the exact 11-digit local form Anchor requires
// (e.g. "+234 801 234 5678" / "8012345678" → "08012345678"). Returns null if it can't.
function normalizeNgPhone(raw?: string | null): string | null {
  let n = String(raw ?? '').replace(/\D/g, '');
  if (n.startsWith('234')) n = '0' + n.slice(3);   // +234 / 234 country code → leading 0
  else if (n.length === 10) n = '0' + n;           // missing leading 0
  return n.length === 11 ? n : null;
}

/** Build an Anchor BusinessCustomer `attributes` object from Weave's KYB (confirmed
 *  shape: { address, basicDetail, contact, officers }). NOTE: `industry` uses Anchor's
 *  own taxonomy (e.g. "Agriculture-AgriculturalCooperatives") which Weave's coarse
 *  productCategory doesn't match — omitted until the KYB form emits Anchor's enum
 *  values, so a wrong value can't reject the whole customer. */
function buildAnchorCustomerPayload(merchant: any, kyb: any) {
  const ownershipRaw = kyb?.ownershipPercentage != null && kyb.ownershipPercentage !== '' ? Number(kyb.ownershipPercentage) : undefined;
  // Anchor KYB requires ≥1 officer with role OWNER holding ≥5%; default a sole
  // signatory to 100% when unspecified. `percentageOwned` is required (non-null) on
  // EVERY officer (confirmed against sandbox).
  const ownerPct = Number.isFinite(ownershipRaw) && (ownershipRaw as number) > 0 ? (ownershipRaw as number) : 100;
  const bizAddress = kyb?.businessAddress
    ? { addressLine_1: String(kyb.businessAddress), city: kyb.city || '', state: kyb.state || '', ...(kyb.postalCode ? { postalCode: String(kyb.postalCode) } : {}), country: 'NG' }
    : undefined;
  const email = String(merchant.email);
  const phone = normalizeNgPhone(kyb?.directorPhone);
  // The primary signatory is emitted as BOTH a DIRECTOR and an OWNER — Weave collects
  // one person, and Anchor needs a director designation plus owner (≥5%) information.
  const personBase = {
    fullName: { firstName: kyb?.firstName || '', lastName: kyb?.lastName || '' },
    nationality: 'NG',
    ...(kyb?.dob ? { dateOfBirth: kyb.dob } : {}),
    email,
    ...(phone ? { phoneNumber: phone } : {}),
    ...(kyb?.directorBvn ? { bvn: String(kyb.directorBvn) } : {}),
    ...(kyb?.personalAddress ? { address: { addressLine_1: String(kyb.personalAddress), city: kyb.city || '', state: kyb.state || '', country: 'NG' } } : {}),
  };
  const officers = (kyb?.firstName || kyb?.lastName) ? [
    { role: 'DIRECTOR', title: 'Manager', percentageOwned: 0, ...personBase },
    { role: 'OWNER', percentageOwned: ownerPct, ...personBase },
  ] : [];
  return {
    ...(kyb?.state ? { address: { country: 'NG', state: String(kyb.state) } } : { address: { country: 'NG' } }),
    basicDetail: {
      businessName: kyb?.legalName || merchant.name,
      country: 'NG',
      industry: anchorIndustry(kyb),
      registrationType: anchorRegistrationType(kyb?.entityType),
      ...(kyb?.businessBvn ? { businessBvn: String(kyb.businessBvn) } : {}),
      ...(kyb?.dateOfRegistration ? { dateOfRegistration: String(kyb.dateOfRegistration) } : {}),
      ...(kyb?.productDescription ? { description: String(kyb.productDescription) } : {}),
      ...(kyb?.websiteUrl ? { website: String(kyb.websiteUrl) } : {}),
    },
    contact: {
      email: { general: email, support: String(kyb?.supportEmail || email), dispute: String(kyb?.supportEmail || email) },
      ...(phone ? { phoneNumber: phone } : {}),
      ...(bizAddress ? { address: { main: bizAddress, registered: bizAddress } } : {}),
    },
    ...(officers.length ? { officers } : {}),
  };
}

/** Create the merchant's DepositAccount once KYB is approved (idempotent). */
async function ensureAnchorDepositAccount(merchantId: string, customerId: string, kybStatus: string, sandbox: boolean): Promise<{ accountId: string | null; accountNumber: string | null }> {
  const m = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (m?.anchorAccountId) return { accountId: m.anchorAccountId, accountNumber: m.anchorAccountNumber ?? null };
  if (kybStatus !== 'approved') return { accountId: null, accountNumber: null };
  const account = await anchor.createDepositAccount(customerId, { sandbox });
  const accountNumber = ((account.attributes as any)?.accountNumber as string) ?? null;
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { anchorAccountId: account.id, ...(accountNumber ? { anchorAccountNumber: accountNumber } : {}), anchorOnboardedAt: new Date() },
  });
  return { accountId: account.id, accountNumber };
}

// POST /api/v1/merchant/anchor/connect — ensure BusinessCustomer + trigger KYB (+ create
// the deposit account if already approved). Idempotent.
router.post('/anchor/connect', requireSession, async (req, res) => {
  if (!ANCHOR_ENABLED) return res.status(503).json({ success: false, error: 'Naira payouts are not currently available.' });
  try {
    const sandbox = anchorOnboardSandbox();
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId }, include: { verification: true } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });
    const v = merchant.verification;
    if (!v?.legalName) {
      return res.status(400).json({ success: false, error: 'Please complete your business verification (KYB) first.' });
    }
    // Anchor KYB requires fields Weave's earlier KYB didn't collect — validate up-front so
    // the merchant gets an actionable prompt instead of an opaque provider 400.
    const missing: string[] = [];
    if (!v.businessBvn)         missing.push('Business BVN');
    if (!v.dateOfRegistration)  missing.push('Date of Registration');
    if (!v.directorBvn)         missing.push('Director BVN');
    if (!v.firstName || !v.lastName) missing.push('Director name');
    if (!v.dob)                 missing.push('Director date of birth');
    if (!normalizeNgPhone(v.directorPhone)) missing.push('Director phone (a valid Nigerian number)');
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Add these to your business verification first: ${missing.join(', ')}.`, missing });
    }

    // 1. Ensure the BusinessCustomer.
    let customerId = merchant.anchorCustomerId;
    if (!customerId) {
      const customer = await anchor.createBusinessCustomer(buildAnchorCustomerPayload(merchant, merchant.verification), { sandbox });
      customerId = customer.id;
      await prisma.merchant.update({ where: { id: merchant.id }, data: { anchorCustomerId: customerId, anchorKybStatus: 'unverified' } });
      recordMerchantAudit(req, 'anchor.customer.created', { metadata: { customerId } });
    }

    // 2. Trigger KYB if we haven't yet.
    let kybStatus = merchant.anchorKybStatus ?? 'unverified';
    if (kybStatus === 'unverified') {
      await anchor.triggerBusinessKYB(customerId, { sandbox });
      kybStatus = 'pending';
      await prisma.merchant.update({ where: { id: merchant.id }, data: { anchorKybStatus: 'pending' } });
      recordMerchantAudit(req, 'anchor.kyb.triggered', { metadata: { customerId } });
    }

    // 3. If already approved (sandbox often auto-approves), provision the deposit account.
    const account = await ensureAnchorDepositAccount(merchant.id, customerId, kybStatus, sandbox);
    if (account.accountId && !merchant.anchorAccountId) {
      recordMerchantAudit(req, 'anchor.deposit_account.created', { metadata: { accountId: account.accountId } });
    }

    return res.json({
      success: true,
      data: { customerId, kybStatus, accountId: account.accountId, accountNumber: account.accountNumber, canCollectNaira: kybStatus === 'approved' && !!account.accountId },
    });
  } catch (err: any) {
    console.error('[merchant] anchor connect failed:', err.message);
    return res.status(502).json({ success: false, error: 'Could not set up naira payments. Please try again.' });
  }
});

// GET /api/v1/merchant/anchor/status — cached status + best-effort live KYB refresh
// (in case a customer.identification.* webhook was missed), provisioning the deposit
// account on approval.
router.get('/anchor/status', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    let kybStatus     = merchant.anchorKybStatus ?? null;
    let accountId     = merchant.anchorAccountId ?? null;
    let accountNumber = merchant.anchorAccountNumber ?? null;

    if (ANCHOR_ENABLED && merchant.anchorCustomerId) {
      try {
        const sandbox = anchorOnboardSandbox();
        const cust = await anchor.getCustomer(merchant.anchorCustomerId, { sandbox });
        const raw = ((cust.attributes as any)?.verification?.status ?? (cust.attributes as any)?.status) as string | undefined;
        const mapped = mapAnchorVerificationStatus(raw);
        if (mapped && mapped !== kybStatus) {
          kybStatus = mapped;
          // Anchor is the KYB authority — mirror its outcome onto Weave's KYB (safety-net
          // for a missed customer.identification.* webhook).
          await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
              anchorKybStatus: mapped,
              ...(mapped === 'approved' ? { kycLevel: 'verified' } : {}),
              ...(mapped === 'rejected' ? { kycLevel: 'basic' } : {}),
            },
          });
          if (mapped === 'approved' || mapped === 'rejected') {
            await prisma.businessVerification.updateMany({
              where: { merchantId: merchant.id },
              data: { status: mapped === 'approved' ? 'verified' : 'rejected' },
            });
          }
        }
        const account = await ensureAnchorDepositAccount(merchant.id, merchant.anchorCustomerId, kybStatus ?? 'unverified', sandbox);
        accountId     = account.accountId ?? accountId;
        accountNumber = account.accountNumber ?? accountNumber;
      } catch (err: any) {
        console.warn('[merchant] anchor status refresh failed:', err.message);
      }
    }

    return res.json({
      success: true,
      data: {
        enabled:        ANCHOR_ENABLED,
        customerId:     merchant.anchorCustomerId ?? null,
        kybStatus,
        accountId,
        accountNumber,
        canCollectNaira: kybStatus === 'approved' && !!accountId,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Map an Anchor KYB documentType → a TEXT value Weave already holds (for auto-relay).
function anchorAutoDocText(documentType: string, kyb: any): string | undefined {
  switch (documentType) {
    case 'RC_NUMBER': return kyb?.regNumber || undefined;
    // TIN and all FILE documents are supplied by the merchant in the checklist.
  }
  return undefined;
}

// GET /api/v1/merchant/anchor/documents — the KYB document checklist. Auto-relays the
// TEXT documents Weave already holds (RC_NUMBER) so the merchant only supplies the rest.
router.get('/anchor/documents', requireSession, async (req, res) => {
  if (!ANCHOR_ENABLED) return res.status(503).json({ success: false, error: 'Naira payments are not currently available.' });
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId }, include: { verification: true } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });
    if (!merchant.anchorCustomerId) {
      return res.json({ success: true, data: { ready: false, kybStatus: merchant.anchorKybStatus ?? null, documents: [] } });
    }
    const sandbox = anchorOnboardSandbox();
    const customerId = merchant.anchorCustomerId;

    let docs = await anchor.getDocuments(customerId, { sandbox });
    let relayed = 0;
    for (const d of docs.filter((x) => !x.submitted && x.format === 'TEXT')) {
      const val = anchorAutoDocText(d.documentType, merchant.verification);
      if (val) {
        try { await anchor.uploadDocumentText(customerId, d.id, val, { sandbox }); relayed++; }
        catch (e: any) { console.warn(`[merchant] anchor auto-relay ${d.documentType} failed:`, e.message); }
      }
    }
    if (relayed) docs = await anchor.getDocuments(customerId, { sandbox });

    return res.json({
      success: true,
      data: {
        ready: true,
        kybStatus: merchant.anchorKybStatus ?? null,
        documents: docs.map((d) => ({ documentType: d.documentType, format: d.format, submitted: d.submitted, verified: d.verified, description: d.description })),
      },
    });
  } catch (err: any) {
    console.error('[merchant] anchor documents list failed:', err.message);
    return res.status(502).json({ success: false, error: 'Could not load your verification documents. Please try again.' });
  }
});

// POST /api/v1/merchant/anchor/documents/upload — relay ONE KYB document to Anchor.
// Body: { documentType, textData } for TEXT docs, or { documentType, fileBase64, fileName?, contentType? } for FILE docs.
router.post('/anchor/documents/upload', requireSession, async (req, res) => {
  if (!ANCHOR_ENABLED) return res.status(503).json({ success: false, error: 'Naira payments are not currently available.' });
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant?.anchorCustomerId) return res.status(400).json({ success: false, error: 'Start naira setup first.' });
    const sandbox = anchorOnboardSandbox();
    const customerId = merchant.anchorCustomerId;

    const documentType = String(req.body?.documentType ?? '');
    if (!documentType) return res.status(400).json({ success: false, error: 'documentType is required' });

    const docs = await anchor.getDocuments(customerId, { sandbox });
    const doc = docs.find((d) => d.documentType === documentType);
    if (!doc) return res.status(400).json({ success: false, error: 'Unknown document for this customer' });
    if (doc.submitted) return res.json({ success: true, data: { documentType, submitted: true, alreadySubmitted: true } });

    if (doc.format === 'TEXT') {
      const textData = String(req.body?.textData ?? '').trim();
      if (!textData) return res.status(400).json({ success: false, error: 'A value is required for this document' });
      await anchor.uploadDocumentText(customerId, doc.id, textData, { sandbox });
    } else {
      const raw = String(req.body?.fileBase64 ?? '');
      if (!raw) return res.status(400).json({ success: false, error: 'A file is required for this document' });
      const b64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw; // strip data: URI prefix
      const buffer = Buffer.from(b64, 'base64');
      if (!buffer.length) return res.status(400).json({ success: false, error: 'Invalid file data' });
      const fileName = String(req.body?.fileName ?? `${documentType}.pdf`);
      const contentType = req.body?.contentType ? String(req.body.contentType) : undefined;
      await anchor.uploadDocumentFile(customerId, doc.id, { buffer, fileName, contentType }, { sandbox });
    }

    recordMerchantAudit(req, 'anchor.document.uploaded', { metadata: { documentType } });

    const fresh = await anchor.getDocuments(customerId, { sandbox });
    return res.json({
      success: true,
      data: {
        documentType, submitted: true,
        documents: fresh.map((d) => ({ documentType: d.documentType, format: d.format, submitted: d.submitted, verified: d.verified, description: d.description })),
      },
    });
  } catch (err: any) {
    console.error('[merchant] anchor document upload failed:', err.message);
    return res.status(502).json({ success: false, error: 'Could not upload the document. Please try again.' });
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

    const data = events.map((e) => {
      // Server-to-server callers (API/secret key) and internal system actions
      // carry no User-Agent — classify those as "Server" rather than "Unknown".
      const authMethod = (e.metadata as Record<string, unknown> | null)?.authMethod;
      const serverAuth =
        e.actorType === 'system' || authMethod === 'api_key' || authMethod === 'secret_key';
      return {
        ...e,
        merchant: e.merchantId ? byId.get(e.merchantId) ?? null : null,
        device: deviceTypeFromUA(e.userAgent, { serverAuth }),
      };
    });

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
