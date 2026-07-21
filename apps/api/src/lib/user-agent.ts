export type DeviceType = 'Phone' | 'Tablet' | 'Desktop' | 'Server' | 'Bot' | 'Unknown';

// Lightweight, dependency-free device classification from a User-Agent string.
// Enough for the "Phone / Desktop" display Paystack shows — not a full UA parser.
export function deviceTypeFromUA(ua: string | null | undefined): DeviceType {
  if (!ua) return 'Unknown';
  const s = ua.toLowerCase();

  // Server-side HTTP clients (a merchant's backend calling the API) — NOT an
  // end-customer device. Distinct from crawlers so the label reads accurately.
  if (/axios|node-fetch|okhttp|go-http|python-requests|python-urllib|java\/|libcurl|curl\/|wget|postman|guzzle|httpie|ruby|\.net|dart:io/.test(s)) return 'Server';
  if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit/.test(s)) return 'Bot';
  // Tablets first — Android tablets omit "mobile", iPads can masquerade as desktop Safari.
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(s)) return 'Tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/.test(s)) return 'Phone';
  if (/windows|macintosh|mac os x|linux|cros|x11/.test(s)) return 'Desktop';
  return 'Unknown';
}
