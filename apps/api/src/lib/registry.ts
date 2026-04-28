
export const CHAIN_ENUM: Record<string, string> = {
  BASE:      'BASE_MAINNET',
  ETHEREUM:  'ETHEREUM_MAINNET',
  OPTIMISM:  'OPTIMISM_MAINNET',
  ARBITRUM:  'ARBITRUM_MAINNET',
  POLYGON:   'POLYGON_MAINNET',
  BSC:       'BSC_MAINNET',
  AVALANCHE: 'AVALANCHE_MAINNET',
  LISK:      'LISK_MAINNET',
  SOLANA:    'SOLANA_MAINNET',
  STARKNET:  'STARKNET_MAINNET',
};

export interface TokenInfo { address: string; decimals: number; }

export const TOKENS: Record<string, Record<string, TokenInfo>> = {
  BASE_MAINNET: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
    ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  },
  ETHEREUM_MAINNET: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    DAI:  { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  },
  OPTIMISM_MAINNET: {
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
    ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  },
  ARBITRUM_MAINNET: {
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  },
  POLYGON_MAINNET: {
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  },
  BSC_MAINNET: {
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    BNB:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  AVALANCHE_MAINNET: {
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6 },
    USDT: { address: '0x9702230A24153017392193D474d6c63BE6326BBb', decimals: 6 },
  },
};
