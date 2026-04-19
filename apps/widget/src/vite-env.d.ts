/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEAVE_API_KEY: string;
  readonly VITE_API_BASE: string;
  readonly VITE_WEAVE_OUTPUT_TYPE: 'stablecoin' | 'fiat';
  readonly VITE_WEAVE_FIAT_CURRENCIES: string;
  readonly VITE_WEAVE_STABLECOIN_SYMBOL: string;
  readonly VITE_WEAVE_STABLECOIN_CHAIN: string;
  readonly VITE_WEAVE_PRIMARY_COLOR: string;
  readonly VITE_WEAVE_VENDOR_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
