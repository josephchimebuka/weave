import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout options (nav bar title, links). Consumed by the docs layout and
 * any future home/marketing layout.
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-semibold tracking-tight" style={{ color: '#0f5d4c' }}>
        Weave
      </span>
    ),
  },
  links: [
    { text: 'Dashboard', url: 'https://app.paywithweave.com', active: 'none' },
  ],
};
