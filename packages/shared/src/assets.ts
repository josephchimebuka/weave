export interface FiatMeta {
  key:      string;
  name:     string;
  symbol:   string;
  flag:     string;
  rate:     number;
  min:      number;
  country:  string;
}

export interface CryptoMeta {
  key:      string;
  id:       string; // API chain id e.g. "BASE"
  name:     string; // Human chain name e.g. "Base"
  token:    string; // e.g. "USDC"
  tint:     string; // Brand color
  icon:     string; // Symbol e.g. "$"
  network:  string; // Detailed network name
  logo:     string; // URL
}

export const SUPPORTED_FIAT: FiatMeta[] = [
  { key: 'fiat:NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', rate: 1515, min: 5000, country: 'Nigeria' },
];

export const SUPPORTED_CRYPTO: CryptoMeta[] = [
  { key: 'crypto:BASE:USDC', id: 'BASE', name: 'Base', token: 'USDC', tint: '#1C4FE0', icon: '$', network: 'Base', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:BASE:ETH', id: 'BASE', name: 'Base', token: 'ETH',  tint: '#1C4FE0', icon: 'Ξ', network: 'Base', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
  { key: 'crypto:BASE:cbBTC', id: 'BASE', name: 'Base', token: 'cbBTC', tint: '#1C4FE0', icon: '₿', network: 'Base', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png' },
  { key: 'crypto:ETHEREUM:ETH', id: 'ETHEREUM', name: 'Ethereum', token: 'ETH',  tint: '#627EEA', icon: 'Ξ', network: 'Ethereum', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
  { key: 'crypto:ETHEREUM:USDC', id: 'ETHEREUM', name: 'Ethereum', token: 'USDC', tint: '#627EEA', icon: '$', network: 'Ethereum', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:ETHEREUM:cbBTC', id: 'ETHEREUM', name: 'Ethereum', token: 'cbBTC', tint: '#627EEA', icon: '₿', network: 'Ethereum', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png' },
  { key: 'crypto:ETHEREUM:USDT', id: 'ETHEREUM', name: 'Ethereum', token: 'USDT', tint: '#627EEA', icon: 'T', network: 'Ethereum', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { id: 'ETHEREUM', name: 'Ethereum', token: 'PEPE', tint: '#627EEA', icon: 'P', network: 'Ethereum', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6982508145454Ce325dDbE47A25d4ec3d2311933/logo.png', key: 'crypto:ETHEREUM:PEPE' },
  { key: 'crypto:ARBITRUM:ETH', id: 'ARBITRUM',  name: 'Arbitrum',     token: 'ETH',  tint: '#28A0F0', icon: 'Ξ', network: 'Arbitrum One', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png' },
  { key: 'crypto:ARBITRUM:USDC', id: 'ARBITRUM',  name: 'Arbitrum',     token: 'USDC', tint: '#28A0F0', icon: '$', network: 'Arbitrum One', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:ARBITRUM:USDT', id: 'ARBITRUM',  name: 'Arbitrum',     token: 'USDT', tint: '#28A0F0', icon: 'T', network: 'Arbitrum One', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:ARBITRUM:cbBTC', id: 'ARBITRUM',  name: 'Arbitrum',     token: 'cbBTC', tint: '#28A0F0', icon: '₿', network: 'Arbitrum One', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf/logo.png' },
  { key: 'crypto:OPTIMISM:ETH', id: 'OPTIMISM',  name: 'Optimism',     token: 'ETH',  tint: '#FF0420', icon: 'Ξ', network: 'Optimism',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png' },
  { key: 'crypto:OPTIMISM:USDC', id: 'OPTIMISM',  name: 'Optimism',     token: 'USDC', tint: '#FF0420', icon: '$', network: 'Optimism',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:OPTIMISM:USDT', id: 'OPTIMISM',  name: 'Optimism',     token: 'USDT', tint: '#FF0420', icon: 'T', network: 'Optimism',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:POLYGON:POL', id: 'POLYGON',   name: 'Polygon',      token: 'POL',  tint: '#7B3FE4', icon: 'P', network: 'Polygon',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png' },
  { key: 'crypto:POLYGON:USDC', id: 'POLYGON',   name: 'Polygon',      token: 'USDC', tint: '#7B3FE4', icon: '$', network: 'Polygon',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:POLYGON:USDT', id: 'POLYGON',   name: 'Polygon',      token: 'USDT', tint: '#7B3FE4', icon: 'T', network: 'Polygon',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:BSC:BNB', id: 'BSC',       name: 'BNB Chain',    token: 'BNB',  tint: '#F0B90B', icon: 'B', network: 'BNB Smart Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png' },
  { key: 'crypto:BSC:USDT', id: 'BSC',       name: 'BNB Chain',    token: 'USDT', tint: '#F0B90B', icon: 'T', network: 'BNB Smart Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:BSC:USDC', id: 'BSC',       name: 'BNB Chain',    token: 'USDC', tint: '#F0B90B', icon: '$', network: 'BNB Smart Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:AVALANCHE:AVAX', id: 'AVALANCHE', name: 'Avalanche', token: 'AVAX', tint: '#E84142', icon: 'A', network: 'Avalanche C-Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchex/info/logo.png' },
  { key: 'crypto:AVALANCHE:USDC', id: 'AVALANCHE', name: 'Avalanche', token: 'USDC', tint: '#E84142', icon: '$', network: 'Avalanche C-Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:AVALANCHE:USDT', id: 'AVALANCHE', name: 'Avalanche', token: 'USDT', tint: '#E84142', icon: 'T', network: 'Avalanche C-Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:GNOSIS:USDC', id: 'GNOSIS',    name: 'Gnosis',       token: 'USDC', tint: '#04795B', icon: '$', network: 'Gnosis Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:GNOSIS:EURe', id: 'GNOSIS',    name: 'Gnosis',       token: 'EURe', tint: '#04795B', icon: '€', network: 'Gnosis Chain', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png' },
  { key: 'crypto:SCROLL:USDC', id: 'SCROLL',    name: 'Scroll',       token: 'USDC', tint: '#D9A26C', icon: '$', network: 'Scroll',       logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:SCROLL:USDT', id: 'SCROLL',    name: 'Scroll',       token: 'USDT', tint: '#D9A26C', icon: 'T', network: 'Scroll',       logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:ALEO:ALEO', id: 'ALEO',      name: 'Aleo',         token: 'ALEO', tint: '#111111', icon: 'A', network: 'Aleo',            logo: 'https://monad.xyz/favicon.ico' },
  { key: 'crypto:XLAYER:USDT', id: 'XLAYER',    name: 'X Layer',      token: 'USDT', tint: '#1E1E1E', icon: 'T', network: 'X Layer',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:BERA:BERA', id: 'BERA',      name: 'Berachain',    token: 'BERA', tint: '#814625', icon: 'B', network: 'Berachain',    logo: 'https://assets.coingecko.com/coins/images/31034/standard/bera.png' },
  { key: 'crypto:SOLANA:SOL', id: 'SOLANA',    name: 'Solana',       token: 'SOL',  tint: '#14F195', icon: 'S', network: 'Solana',       logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png' },
  { key: 'crypto:SOLANA:USDC', id: 'SOLANA',    name: 'Solana',       token: 'USDC', tint: '#14F195', icon: '$', network: 'Solana',       logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:SOLANA:WIF', id: 'SOLANA',    name: 'Solana',       token: 'WIF',  tint: '#14F195', icon: 'W', network: 'Solana',       logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/assets/EKpQGSJtjMFqKZ9KQanAtY7YXDeJs2H3ob77S2SpxmX/logo.png' },
  { key: 'crypto:TRON:TRX', id: 'TRON',      name: 'Tron',         token: 'TRX',  tint: '#EF0027', icon: 'T', network: 'Tron',         logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png' },
  { key: 'crypto:TRON:USDT', id: 'TRON',      name: 'Tron',         token: 'USDT', tint: '#EF0027', icon: 'T', network: 'Tron',         logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:NEAR:NEAR', id: 'NEAR',      name: 'NEAR',         token: 'NEAR', tint: '#111111', icon: 'N', network: 'NEAR',         logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png' },
  { key: 'crypto:NEAR:USDC', id: 'NEAR',      name: 'NEAR',         token: 'USDC', tint: '#111111', icon: '$', network: 'NEAR',         logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:TON:TON', id: 'TON',       name: 'TON',          token: 'TON',  tint: '#0098EA', icon: 'T', network: 'TON',          logo: 'https://assets.coingecko.com/coins/images/17980/standard/ton_symbol.png' },
  { key: 'crypto:TON:USDT', id: 'TON',       name: 'TON',          token: 'USDT', tint: '#0098EA', icon: 'T', network: 'TON',          logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { key: 'crypto:SUI:SUI', id: 'SUI',       name: 'Sui',          token: 'SUI',  tint: '#4DA2FF', icon: 'S', network: 'Sui',          logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png' },
  { key: 'crypto:SUI:USDC', id: 'SUI',       name: 'Sui',          token: 'USDC', tint: '#4DA2FF', icon: '$', network: 'Sui',          logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:APTOS:APT', id: 'APTOS',     name: 'Aptos',        token: 'APT',  tint: '#111111', icon: 'A', network: 'Aptos',        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png' },
  { key: 'crypto:APTOS:USDC', id: 'APTOS',     name: 'Aptos',        token: 'USDC', tint: '#111111', icon: '$', network: 'Aptos',        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { key: 'crypto:APTOS:USDT', id: 'APTOS',     name: 'Aptos',        token: 'USDT', tint: '#111111', icon: 'T', network: 'Aptos',        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png' },
  { id: 'STARKNET',  name: 'Starknet',     token: 'STRK', tint: '#EC796B', icon: 'S', network: 'Starknet',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/starknet/info/logo.png', key: 'crypto:STARKNET:STRK' },
  { key: 'crypto:BITCOIN:BTC', id: 'BITCOIN',   name: 'Bitcoin',      token: 'BTC',  tint: '#F7931A', icon: '₿', network: 'Bitcoin',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png' },
  { key: 'crypto:XRP:XRP', id: 'XRP',       name: 'XRP Ledger',   token: 'XRP',  tint: '#23292F', icon: 'X', network: 'XRP Ledger',   logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ripple/info/logo.png' },
  { key: 'crypto:STELLAR:XLM', id: 'STELLAR',   name: 'Stellar',      token: 'XLM',  tint: '#111111', icon: '★', network: 'Stellar',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/stellar/info/logo.png' },
  { key: 'crypto:STELLAR:USDC', id: 'STELLAR',   name: 'Stellar',      token: 'USDC', tint: '#111111', icon: '$', network: 'Stellar',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
  { id: 'CARDANO',   name: 'Cardano',      token: 'ADA',  tint: '#0033AD', icon: '₳', network: 'Cardano',      logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png', key: 'crypto:CARDANO:ADA' },
  { id: 'DOGE',      name: 'Dogecoin',     token: 'DOGE', tint: '#C2A633', icon: 'D', network: 'Dogecoin',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/doge/info/logo.png', key: 'crypto:DOGE:DOGE' },
  { id: 'LITECOIN',  name: 'Litecoin',     token: 'LTC',  tint: '#345D9D', icon: 'L', network: 'Litecoin',     logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/litecoin/info/logo.png', key: 'crypto:LITECOIN:LTC' },
  { id: 'BCH',       name: 'Bitcoin Cash', token: 'BCH',  tint: '#8DC351', icon: 'B', network: 'Bitcoin Cash', logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoincash/info/logo.png', key: 'crypto:BCH:BCH' },
  { id: 'ZEC',       name: 'Zcash',        token: 'ZEC',  tint: '#F4B728', icon: 'Z', network: 'Zcash',        logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zcash/info/logo.png', key: 'crypto:ZEC:ZEC' },
  { id: 'DASH',      name: 'Dash',         token: 'DASH', tint: '#008CE7', icon: 'D', network: 'Dash',         logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/dash/info/logo.png', key: 'crypto:DASH:DASH' },
];

export type AssetKey = string;

export interface FiatAsset {
  kind:     'fiat';
  currency: string;
}

export interface CryptoAsset {
  kind:  'crypto';
  chain: string;
  token: string;
}

export interface ParsedFiatAsset {
  kind:     'fiat';
  currency: string; // e.g. "NGN"
  key:      string;
}

export interface ParsedCryptoAsset {
  kind:    'crypto';
  chain:   string; // e.g. "BASE"
  token:   string; // e.g. "USDC"
  key:     string;
}

export type ParsedAsset = ParsedFiatAsset | ParsedCryptoAsset;

export function parseAsset(key: string): ParsedAsset {
  if (!key) throw new Error('asset key is required');
  const parts = key.split(':');
  if (parts[0] === 'fiat' && parts[1]) {
    const currency = parts[1].toUpperCase();
    return { kind: 'fiat', currency, key: `fiat:${currency}` };
  }
  if (parts[0] === 'crypto' && parts[1] && parts[2]) {
    const chain = parts[1].toUpperCase();
    const token = parts[2].toUpperCase();
    return { kind: 'crypto', chain, token, key: `crypto:${chain}:${token}` };
  }
  throw new Error(`Invalid asset key: "${key}". Expected "fiat:CCY" or "crypto:CHAIN:TOKEN"`);
}

export const fiatKey   = (currency: string)             => `fiat:${currency.toUpperCase()}`;
export const cryptoKey = (chain: string, token: string) => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
export const isFiat    = (key: string)                  => key.startsWith('fiat:');
export const isCrypto  = (key: string)                  => key.startsWith('crypto:');

/**
 * Returns a human-friendly label for an asset key.
 */
export function assetLabel(key: string): string {
  try {
    const a = parseAsset(key);
    if (a.kind === 'fiat') return a.currency;
    return `${a.token} · ${a.chain}`;
  } catch {
    return key;
  }
}

/**
 * Returns the meta for a known asset key.
 */
export function assetMeta(key: string) {
  if (isFiat(key)) return SUPPORTED_FIAT.find(f => f.key === key);
  return SUPPORTED_CRYPTO.find(c => c.key === key);
}

export type OrderDirection = 'offramp' | 'onramp' | 'bridge' | 'transfer';

/**
 * Determines the logical direction of an order based on source/dest assets.
 */
export function directionOf(sourceKey: string, destKey: string): OrderDirection {
  try {
    const s = parseAsset(sourceKey).kind;
    const d = parseAsset(destKey).kind;
    if (s === 'crypto' && d === 'fiat')   return 'offramp';
    if (s === 'fiat'   && d === 'crypto') return 'onramp';
    if (s === 'crypto' && d === 'crypto') return 'bridge';
    return 'transfer';
  } catch {
    return 'transfer';
  }
}

/**
 * Mapping of institution codes to metadata, indexed by currency.
 * This is the single source of truth for both the UI and settlement logic.
 */
export const INSTITUTIONS_BY_CUR = {
  NGN: [
    { code: 'GTBINGLA', name: 'Guaranty Trust Bank', paystack: 'guaranty-trust-bank' },
    { code: 'ABNGNGLA', name: 'Access Bank', paystack: 'access-bank' },
    { code: 'ZEIBNGLA', name: 'Zenith Bank', paystack: 'zenith-bank' },
    { code: 'UBANNGLA', name: 'United Bank for Africa', paystack: 'united-bank-for-africa' },
    { code: 'FBNINGLA', name: 'First Bank of Nigeria', paystack: 'first-bank-of-nigeria' },
    { code: 'FCMBNGLA', name: 'First City Monument Bank', paystack: 'first-city-monument-bank' },
    { code: 'FIDTNGLA', name: 'Fidelity Bank', paystack: 'fidelity-bank' },
    { code: 'STBKNGLA', name: 'Stanbic IBTC Bank', paystack: 'stanbic-ibtc-bank' },
    { code: 'UBNINGLA', name: 'Union Bank of Nigeria', paystack: 'union-bank-of-nigeria' },
    { code: 'WEMANGLA', name: 'Wema Bank', paystack: 'wema-bank' },
    { code: 'ECOBNGLA', name: 'Ecobank Nigeria', paystack: 'ecobank-nigeria' },
    { code: 'KUDANGPC', name: 'Kuda Bank', paystack: 'kuda-bank' },
    { code: 'OPAYNGPC', name: 'OPay', paystack: 'paycom' },
    { code: 'MONINGPC', name: 'Moniepoint', paystack: 'moniepoint-mfb-ng' },
    { code: 'PALMNGPC', name: 'PalmPay', paystack: 'palmpay' },
  ],
} as const;

/**
 * Resolves an institution code to its human-friendly name.
 */
export function institutionName(currency: string, code: string): string {
  const list = (INSTITUTIONS_BY_CUR as any)[currency.toUpperCase()] || [];
  const found = list.find((i: any) => i.code.toUpperCase() === code.toUpperCase());
  return found ? found.name : code;
}
