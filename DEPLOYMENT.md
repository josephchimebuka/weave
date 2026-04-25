# 🚀 Weave Production Deployment Guide

This document outlines the steps required to take the Weave monorepo from local development to a public production environment.

## 1. Service Prerequisites
Before deploying, ensure you have the following accounts/services ready:
- **Database**: PostgreSQL (e.g., Supabase, Neon, or RDS).
- **Redis**: For BullMQ and Rate Limiting (e.g., Upstash or Aiven).
- **Email**: Resend API account.
- **Hosting**: 
  - **API**: Node.js compatible (Render, Fly.io, or Railway).
  - **Dashboard/Widget**: Vercel or Netlify.

---

## 2. Environment Variables Checklist

### API Service (`apps/api`)
| Key | Purpose | Suggested Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Prisma Connection | `postgresql://...` |
| `REDIS_HOST` | Redis Connection | `your-redis-host.com` |
| `REDIS_PORT` | Redis Port | `6379` |
| `REDIS_PASSWORD`| Redis Auth | `your-password` |
| `ADMIN_EMAIL` | KYB Alerts | Your personal/work email |
| `SUPPORT_EMAIL` | Dashboard Inquiries | `support@yourdomain.com` |
| `ADMIN_SECRET` | Magic Link Signing | A long random string |
| `RESEND_API_KEY`| Email Delivery | `re_...` |
| `API_URL` | API Base (Backend) | `https://api.yourdomain.com/api/v1` |
| `DASHBOARD_URL` | Dashboard Base | `https://dashboard.yourdomain.com` |
| `PAYCREST_API_KEY` | Paycrest Production Key | `pk_...` |
| `PAYCREST_WEBHOOK_SECRET`| Paycrest Webhook Secret | `whsec_...` (CRITICAL for security) |
| `CHAINRAILS_API_KEY` | ChainRails Production Key | `cr_...` |
| `CHAINRAILS_WEBHOOK_SECRET`| ChainRails Webhook Secret| `whsec_...` (CRITICAL for security) |
| `WEAVE_EVM_REFUND_ADDRESS`| System Base Wallet | `0x...` (Where Paycrest refunds land) |
| `RESEND_FROM_EMAIL` | Verified Sender Address | `payments@yourdomain.com` |
| `SENDER_FEE_BPS` | Your markup in BPS | `75` (0.75%) |

### Dashboard (`apps/dashboard`)
| Key | Purpose | Suggested Value |
| :--- | :--- | :--- |
| `API_BASE` | Proxy Target | `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_API_BASE`| Client-Side API | `https://api.yourdomain.com/api/v1` |
| `AUTH_SESSION_COOKIE` | Cookie Name | `weave_session` |

---

## 3. Production Deployment Steps

### Step A: Database Preparation
1. Create your production PostgreSQL database.
2. From your local machine, pointing to the prod URL:
   ```bash
   pnpm --filter @weave/api db:push
   ```

### Step B: API Deployment (Node.js)
1. Set the root directory to `apps/api`.
2. Build command: `pnpm build`.
3. Start command: `node dist/index.js`.

### Step C: Dashboard Deployment (Next.js)
1. Deploy via Vercel for the best experience.
2. Set the root directory to `apps/dashboard`.
3. Add the `API_BASE` env so the server-side proxy works.

---

---

## 5. Publishing the Widget

Weave is distributed as an NPM package for framework users and a UMD bundle for vanilla JS users.

### Step A: Building the Bundle
From the root directory:
```bash
pnpm --filter @weave/widget build
```
This generates `dist/index.mjs` (ESM) and `dist/index.umd.js` (UMD).

### Step B: Publishing to NPM
1. Ensure your version is correct in `apps/widget/package.json`.
2. Login to your NPM account:
   ```bash
   npm login
   ```
3. Publish with public access:
   ```bash
   pnpm --filter @weave/widget publish --access public
   ```

### Step C: CDN Distribution (unpkg/jsdelivr)
Once published to NPM, the widget is automatically available on CDNs. 
Recommended URLs for your Documentation:
- **JS**: `https://unpkg.com/@weave/widget@latest/dist/index.umd.js`
- **CSS**: `https://unpkg.com/@weave/widget@latest/dist/style.css`

---

## 6. Post-Deployment Checklist
- [ ] Confirm `ADMIN_EMAIL` is receiving KYB alerts.
- [ ] Test the `pay/` links on a mobile device for responsiveness.
- [ ] Verify that Redis is clearing rate-limit counters after the window expires.
- [ ] Ping the UNPKG URL to ensure the UMD bundle is live.
