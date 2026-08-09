import { NextResponse } from 'next/server';
import { getServerSession } from '../../lib/auth-server';
import crypto from 'crypto';

// Signs a PUBLIC Cloudinary upload for brand assets (logo / background). Unlike
// the KYB signer, these are NOT access-controlled — the cash-out page is public,
// so the returned secure_url must be directly viewable (public `upload` type, no
// `type=authenticated`).
export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder    = 'brand';
  // Alphabetically-sorted params + secret → SHA-1. No `type` = public delivery.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder });
}
