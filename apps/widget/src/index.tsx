import './index.css';

export { WeaveCheckout, type WeaveCheckoutProps, type Merchant } from './components/WeaveWidget';
export { MerchantBackdrop, type MerchantBackdropProps } from './components/MerchantBackdrop';
export { openStellarWalletModal, sendStellarUsdcPayment, getStellarNetwork } from './lib/stellar';
