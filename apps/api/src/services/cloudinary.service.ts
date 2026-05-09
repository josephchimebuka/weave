import crypto from 'crypto';

interface ParsedCloudinaryUrl {
  cloudName:     string;
  resourceType:  string;
  deliveryType:  string;
  versionedPath: string;
}

export function parseCloudinaryUrl(url: string): ParsedCloudinaryUrl | null {
  const m = url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  return {
    cloudName:     m[1],
    resourceType:  m[2],
    deliveryType:  m[3],
    versionedPath: m[4],
  };
}

// sig = base64url(sha1(versionedPath + apiSecret))[:8] — Cloudinary URL-signing spec.
export function signedDeliveryUrl(originalUrl: string): string {
  const parsed = parseCloudinaryUrl(originalUrl);
  if (!parsed) return originalUrl;
  if (parsed.deliveryType === 'upload') return originalUrl;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error('[cloudinary] CLOUDINARY_API_SECRET is not set');

  const sig = crypto
    .createHash('sha1')
    .update(parsed.versionedPath + apiSecret)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, 8);

  return `https://res.cloudinary.com/${parsed.cloudName}/${parsed.resourceType}/${parsed.deliveryType}/s--${sig}--/${parsed.versionedPath}`;
}
