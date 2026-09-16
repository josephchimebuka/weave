export interface RouteStep {
  id:             string;
  orderId:        string;
  sequence:       number;
  provider:       string;    // 'paycrest' | 'chainrails' | 'direct'
  fromAsset:      string;
  toAsset:        string;
  amountIn:       number | null;
  amountOut:      number | null;
  feeUsd:         number | null;
  status:         string;    // 'pending' | 'in_flight' | 'done' | 'failed'
  externalId:     string | null;
  depositAddress: string | null;
  depositMemo:    string | null;
  startedAt:      string | null;
  completedAt:    string | null;
  paystackDvaBank: string | null;
  paystackDvaAcct: string | null;
  paystackDvaRef:  string | null;
  dvaExpiresAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface Order {
  id:                 string;
  clientId:           string;
  userId:             string | null;
  sourceInstrumentId: string;
  destInstrumentId:   string;
  sourceAssetKey:     string;    // "crypto:BASE:USDC" or "fiat:NGN"
  destAssetKey:       string;
  sourceAmount:       number;
  destAmount:         number | null;
  quoteRate:          number | null;
  status:             string;    // 'awaiting_deposit' | 'processing' | 'completed' | 'failed' | 'refunded'
  senderFeeUsd:       number | null;
  appFeeUsd:          number | null;
  bridgeFeeUsd:       number | null;
  createdAt:          string;
  updatedAt:          string;
  bachsSplitStatus?:  string | null;
  bachsPayoutStatus?: string | null;   // "pending" | "processing" | "paid" | "blocked" | "failed"
  bachsPayoutAt?:     string | null;
  amountCollected?:   number | null;   // NGN actually credited to the order's NUBAN (bank-transfer collections)
  overpaidAmount?:    number | null;   // NGN received above the order total — flag for manual refund
  steps:              RouteStep[];
  sourceInstrument?:  {
    bankInstitution?: string | null;
    bankAccountIdentifier?: string | null;
    bankAccountName?: string | null;
    walletAddress?: string | null;
  };
  destInstrument?:    {
    bankInstitution?: string | null;
    bankAccountIdentifier?: string | null;
    bankAccountName?: string | null;
    walletAddress?: string | null;
  };
  customer?: {
    name?:  string | null;
    email?: string | null;
  } | null;
}

import { 
  parseAsset, 
  assetLabel as sharedAssetLabel, 
  directionOf as sharedDirectionOf, 
  institutionName as sharedInstitutionName,
  type OrderDirection as Direction 
} from '@weave/shared';

/**
 * Compatibility wrapper for the dashboard's property-based calls.
 */
export function directionOf(order: Pick<Order, 'sourceAssetKey' | 'destAssetKey'>): Direction {
  return sharedDirectionOf(order.sourceAssetKey, order.destAssetKey);
}

/**
 * Returns a human-friendly label for an asset key.
 */
export function assetLabel(key: string): string {
  return sharedAssetLabel(key);
}

/**
 * Resolves an institution code to its human-friendly name.
 */
export function institutionName(currency: string, code: string): string {
  return sharedInstitutionName(currency, code);
}

export { parseAsset };
export type { Direction };

