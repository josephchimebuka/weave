import './index.css';

export { WeaveCheckout, type WeaveCheckoutProps, type Merchant } from './components/WeaveWidget';
export { MerchantBackdrop, type MerchantBackdropProps } from './components/MerchantBackdrop';
export {
  applyStellarPublicConfig,
  openStellarWalletModal,
  sendStellarUsdcPayment,
  getStellarNetwork,
} from './lib/stellar';
export type { StellarPublicConfig } from './api/client';
