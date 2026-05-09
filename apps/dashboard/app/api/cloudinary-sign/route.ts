import { NextResponse } from 'next/server';
import { getServerSession } from '../../lib/auth-server';
import crypto from 'crypto';

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder    = 'kyb_documents';
  const type      = 'authenticated';

  // Cloudinary signed upload: SHA-1 of sorted param string + apiSecret.
  // Params must be sorted alphabetically and 'type=authenticated' marks the asset
  // as access-controlled — direct res.cloudinary.com URLs return 401 without a
  // valid s--<sig>-- segment, which we mint server-side in the review proxy.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}&type=${type}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName, folder, type });
}
