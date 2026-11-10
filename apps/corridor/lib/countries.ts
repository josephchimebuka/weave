// The African side of the corridor. Weave's payout rail already
// covers these currencies; a country is "live" once Weave switches it on.
// Corridor is country-agnostic: to add one, add a row here — the recipient
// pills, the landing and /mainnet all read from this list.

export interface AfricanCountry {
  code: string;        // ISO-3166 alpha-2
  name: string;
  currency: string;    // ISO-4217
  symbol: string;
  demonym: string;     // "a bank in Nigeria" → "a Nigerian bank" where needed
  dot: string;         // pill dot colour
  live: boolean;       // switched on in Weave
}

export const AFRICA: AfricanCountry[] = [
  { code: 'NG', name: 'Nigeria',  currency: 'NGN', symbol: '₦',   demonym: 'Nigerian',  dot: '#4F7A5C', live: true },
  { code: 'KE', name: 'Kenya',    currency: 'KES', symbol: 'KSh', demonym: 'Kenyan',    dot: '#6B8F74', live: true },
  { code: 'UG', name: 'Uganda',   currency: 'UGX', symbol: 'USh', demonym: 'Ugandan',   dot: '#6B8F74', live: true },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh', demonym: 'Tanzanian', dot: '#6B8F74', live: true },
];

export const LIVE_AFRICA = AFRICA.filter(c => c.live);
export const NEXT_AFRICA = AFRICA.filter(c => !c.live);
export const NEXT_CURRENCIES = NEXT_AFRICA.map(c => c.currency).join(' · ');

/** Lowercase slug used in the send flow (`ng`, `ke`, …). */
export type AfricaSlug = Lowercase<(typeof AFRICA)[number]['code']>;

export function africaSlug(code: string): AfricaSlug {
  return code.toLowerCase() as AfricaSlug;
}

export function africaBySlug(slug: string): AfricanCountry | undefined {
  return LIVE_AFRICA.find(c => c.code.toLowerCase() === slug);
}

export function isAfricaSlug(to: string): to is AfricaSlug {
  return LIVE_AFRICA.some(c => c.code.toLowerCase() === to);
}
