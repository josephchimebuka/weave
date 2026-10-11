// Brand fonts offered on the hosted cash-out page. Each maps to a CSS stack and,
// where it's a web font, a Google Fonts family to load on demand. Shared by the
// cash-out page (renders the merchant's choice) and the Settings preview.

export type BrandFont = { label: string; stack: string; google?: string };

export const BRAND_FONTS: Record<string, BrandFont> = {
  system:   { label: 'System (clean)',        stack: 'ui-sans-serif, system-ui, -apple-system, sans-serif' },
  sans:     { label: 'Inter (modern)',        stack: 'Inter, ui-sans-serif, system-ui, sans-serif',         google: 'Inter:wght@400;500;600;700' },
  grotesk:  { label: 'Space Grotesk (bold)',  stack: '"Space Grotesk", ui-sans-serif, sans-serif',          google: 'Space+Grotesk:wght@400;500;700' },
  poppins:  { label: 'Poppins (geometric)',   stack: 'Poppins, ui-sans-serif, sans-serif',                  google: 'Poppins:wght@400;500;600;700' },
  rounded:  { label: 'Nunito (rounded)',      stack: 'Nunito, ui-sans-serif, sans-serif',                   google: 'Nunito:wght@400;600;700;800' },
  dmsans:   { label: 'DM Sans (friendly)',    stack: '"DM Sans", ui-sans-serif, sans-serif',                google: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700' },
  serif:    { label: 'Georgia (classic)',     stack: 'Georgia, Cambria, "Times New Roman", serif' },
  playfair: { label: 'Playfair (editorial)',  stack: '"Playfair Display", Georgia, serif',                  google: 'Playfair+Display:wght@500;600;700' },
  fraunces: { label: 'Fraunces (warm serif)', stack: 'Fraunces, Georgia, serif',                            google: 'Fraunces:opsz,wght@9..144,400;9..144,600' },
  mono:     { label: 'Space Mono (technical)',stack: '"Space Mono", ui-monospace, monospace',               google: 'Space+Mono:wght@400;700' },
};

export const BRAND_FONT_KEYS = Object.keys(BRAND_FONTS);

export function fontStack(key?: string | null): string {
  return BRAND_FONTS[key ?? 'system']?.stack ?? BRAND_FONTS.system.stack;
}

export function googleFontHref(key?: string | null): string | null {
  const g = BRAND_FONTS[key ?? '']?.google;
  return g ? `https://fonts.googleapis.com/css2?family=${g}&display=swap` : null;
}

// Idempotently load a brand font's stylesheet into <head> (client-side only).
export function ensureFontLoaded(key?: string | null): void {
  if (typeof document === 'undefined') return;
  const href = googleFontHref(key);
  if (!href) return;
  if (document.querySelector(`link[data-brandfont="${key}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-brandfont', key ?? '');
  document.head.appendChild(link);
}
