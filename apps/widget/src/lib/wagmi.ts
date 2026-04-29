import { createConfig, http } from 'wagmi';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { base, mainnet, arbitrum, optimism, polygon, bsc } from 'viem/chains';

export const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum, optimism, polygon, bsc],
  transports: {
    [base.id]:    http(),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [bsc.id]:     http(),
  },
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Weave Checkout' }),
  ],
});

export const SUPPORTED_CHAIN_IDS = new Set([8453, 1, 10, 42161, 137, 56]);

export const CHAIN_ID_TO_API_NAME: Record<number, string> = {
  8453: 'BASE',
  1:    'ETHEREUM',
  10:   'OPTIMISM',
  42161:'ARBITRUM',
  137:  'POLYGON',
  56:   'BSC',
};

export const CHAIN_ID_TO_DISPLAY: Record<number, string> = {
  8453: 'Base',
  1:    'Ethereum',
  10:   'Optimism',
  42161:'Arbitrum',
  137:  'Polygon',
  56:   'BNB Chain',
};

export const CHAIN_TINT: Record<number, string> = {
  8453: '#1C4FE0',
  1:    '#627EEA',
  10:   '#FF3F57',
  42161:'#12AAFF',
  137:  '#8247E5',
  56:   '#F3BA2F',
};

export const USDC_BY_CHAIN_ID: Record<number, `0x${string}`> = {
  8453:  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  1:     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  10:    '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  137:   '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  56:    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
};

export const USDT_BY_CHAIN_ID: Record<number, `0x${string}`> = {
  1:     '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  10:    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  137:   '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  56:    '0x55d398326f99059fF775485246999027B3197955',
};
