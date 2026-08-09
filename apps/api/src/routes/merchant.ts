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
import { ensureBachsPayoutDestination } from '../services/executor.service';
import { BACHS_ENABLED } from '../lib/flags';
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
  const transfersStatus = find('transfers') ?? merchant.bachsTransfersStatus ?? 'restricted';
  const payoutsStatus   = find('payouts')   ?? merchant.bachsPayoutsStatus   ?? 'restricted';
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      bachsTransfersStatus: transfersStatus,
      bachsPayoutsStatus:   payoutsStatus,
      ...(transfersStatus === 'active' && !merchant.bachsOnboardedAt ? { bachsOnboardedAt: new Date() } : {}),
    },
  });
  return { transfersStatus, payoutsStatus };
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
    const { transfersStatus, payoutsStatus } = await refreshBachsCapabilities(merchant, accountId, sandbox);

    return res.json({
      success: true,
      data: {
        connectedAccountId: accountId,
        setupStatus: checklist.setup_status,   // "complete" | "incomplete"
        transfersStatus,
        payoutsStatus,
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
    const { transfersStatus, payoutsStatus } = await refreshBachsCapabilities(merchant, accountId, sandbox);

    // Audit the KYB-data submission to the payment processor (metadata is PII-free:
    // count + resulting setup status only, never the submitted field values).
    recordMerchantAudit(req, 'bachs.requirements.submitted', {
      targetType: 'connected_account', targetId: accountId,
      metadata: { fields: filled, setupStatus: fresh.setup_status },
    });

    return res.json({
      success: true,
      data: { setupStatus: fresh.setup_status, transfersStatus, payoutsStatus, remaining: remainingFields(fresh), errors: result.errors ?? [] },
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

    let transfersStatus = merchant.bachsTransfersStatus ?? null;
    let payoutsStatus   = merchant.bachsPayoutsStatus ?? null;

    if (BACHS_ENABLED && merchant.bachsConnectedAccountId) {
      try {
        const caps = await bachs.getCapabilities(merchant.bachsConnectedAccountId, { sandbox: bachsOnboardSandbox() });
        const find = (n: string) => caps.find(c => c.name === n)?.status ?? null;
        const t = find('transfers');
        const p = find('payouts');
        if ((t && t !== transfersStatus) || (p && p !== payoutsStatus)) {
          transfersStatus = t ?? transfersStatus;
          payoutsStatus   = p ?? payoutsStatus;
          await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
              ...(t ? { bachsTransfersStatus: t } : {}),
              ...(p ? { bachsPayoutsStatus:   p } : {}),
              ...(t === 'active' && !merchant.bachsOnboardedAt ? { bachsOnboardedAt: new Date() } : {}),
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
        transfersStatus,
        payoutsStatus,
        canCollectNaira:    transfersStatus === 'active',
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
