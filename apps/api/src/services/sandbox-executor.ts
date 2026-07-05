import type { RoutePlanStep } from './router.service';
import { parseAsset } from '../lib/assets';

// Fixed NGN-per-USD(C) rate for sandbox. Single source of truth so order
// creation, quotes, and mock execution all price sandbox flows identically
// without touching live Paycrest.
export const SANDBOX_NGN_RATE = 1400;

export interface SandboxExecution {
  externalId: string;
  amountIn: number;
  amountOut: number;
  depositAddress: string | null;
  depositMemo: string | null;
  expiresAt: string;
  feeUsd: number;
  bankDetails?: {
    institution: string;
    accountIdentifier: string;
    accountName: string;
    amountToTransfer: string;
    currency: string;
  };
  paystackPopupDetails?: {
    accessCode: string;
    publicKey: string;
    amount: number;
    reference: string;
  };
}

export function sandboxDispatch(
  step: RoutePlanStep,
  amountIn: number,
  orderId: string,
  sequence: number,
): SandboxExecution {
  const from = parseAsset(step.fromAsset);
  const externalId = `sandbox-${step.provider}-${orderId}-${sequence}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  switch (step.provider) {
    case 'paystack':
      return {
        externalId, amountIn, amountOut: amountIn,
        depositAddress: null, depositMemo: null, expiresAt,
        feeUsd: (amountIn / SANDBOX_NGN_RATE) * 0.015,
        paystackPopupDetails: {
          accessCode: 'test_access_sandbox',
          publicKey: 'pk_test_sandbox',
          amount: Math.round(amountIn * 100),
          reference: externalId,
        },
      };

    case 'paycrest':
      if (from.kind === 'crypto') {
        return {
          externalId, amountIn,
          amountOut: amountIn * SANDBOX_NGN_RATE,
          depositAddress: '0xSa000000000000000000000000000000000001nd',
          depositMemo: null, expiresAt,
          feeUsd: amountIn * 0.0085,
        };
      } else {
        return {
          externalId, amountIn,
          amountOut: amountIn / SANDBOX_NGN_RATE,
          depositAddress: null, depositMemo: null, expiresAt, feeUsd: 0,
          bankDetails: {
            institution: 'Sandbox Test Bank',
            accountIdentifier: '0000000000',
            accountName: 'Weave Sandbox',
            amountToTransfer: String(amountIn),
            currency: from.kind === 'fiat' ? from.currency : 'NGN',
          },
        };
      }

    case 'nearintents':
      return {
        externalId, amountIn,
        amountOut: amountIn * 0.998,
        depositAddress: '0xSa000000000000000000000000000000000002nd',
        depositMemo: 'sandbox-memo', expiresAt,
        feeUsd: amountIn * 0.002,
      };

    case 'chainrails':
      return {
        externalId, amountIn,
        amountOut: amountIn * 0.9985,
        depositAddress: '0xSa000000000000000000000000000000000003nd',
        depositMemo: null, expiresAt,
        feeUsd: amountIn * 0.0015,
      };

    default:
      return {
        externalId, amountIn, amountOut: amountIn,
        depositAddress: '0xSa000000000000000000000000000000000004nd',
        depositMemo: null, expiresAt, feeUsd: 0,
      };
  }
}
