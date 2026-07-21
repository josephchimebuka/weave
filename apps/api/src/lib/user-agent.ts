export type DeviceType = 'Phone' | 'Tablet' | 'Desktop' | 'Bot' | 'Unknown';

// Lightweight, dependency-free device classification from a User-Agent string.
// Enough for the "Phone / Desktop" display Paystack shows — not a full UA parser.
export function deviceTypeFromUA(ua: string | null | undefined): DeviceType {
  if (!ua) return 'Unknown';
  const s = ua.toLowerCase();

  if (/bot|crawler|spider|curl|wget|python-requests|postman|axios|node-fetch/.test(s)) return 'Bot';
  // Tablets first — Android tablets omit "mobile", iPads can masquerade as desktop Safari.
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/.test(s)) return 'Tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/.test(s)) return 'Phone';
  if (/windows|macintosh|mac os x|linux|cros|x11/.test(s)) return 'Desktop';
  return 'Unknown';
}
