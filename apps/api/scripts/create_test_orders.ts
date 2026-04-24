import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MERCHANT_ID = '35c381e8-adbb-4c17-8dad-1480e5c13f3c';

async function main() {
  console.log('Creating test orders for today and past 10 days...');
  
  const now = new Date();
  const orders = [];
  
  // Create 10 orders spread over the last 10 days
  for (let i = 0; i < 10; i++) {
    const daysAgo = i;
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(10 + i, 30, 0, 0);
    
    const isOfframp = i % 2 === 0;
    
    if (isOfframp) {
      // Offramp: crypto to fiat
      const sourceInst = await prisma.instrument.create({
        data: {
          ownerType: 'merchant',
          merchantId: MERCHANT_ID,
          kind: 'crypto_wallet',
          assetKey: i % 3 === 0 ? 'crypto:BASE:USDC' : 'crypto:OPTIMISM:ETH',
          label: `Test wallet ${i}`,
          walletAddress: `0x${i}`.padEnd(42, '0'),
          createdAt: date,
        },
      });
      
      const destInst = await prisma.instrument.create({
        data: {
          ownerType: 'merchant',
          merchantId: MERCHANT_ID,
          kind: 'bank_account',
          assetKey: 'fiat:NGN',
          label: `Test bank ${i}`,
          bankInstitution: 'GTBank',
          bankAccountName: `Customer ${i}`,
          bankAccountIdentifier: `123${i}`,
          createdAt: date,
        },
      });
      
      const sourceAmount = i % 3 === 0 ? 100 + i * 50 : 1 + i * 0.1; // USDC or ETH
      const destAmount = i % 3 === 0 ? sourceAmount - 2 : sourceAmount * 2500 - 50; // After fees
      
      orders.push({
        clientId: MERCHANT_ID,
        sourceInstrumentId: sourceInst.id,
        destInstrumentId: destInst.id,
        sourceAssetKey: sourceInst.assetKey,
        destAssetKey: destInst.assetKey,
        sourceAmount,
        destAmount,
        quoteRate: i % 3 === 0 ? 1 : 2500,
        status: i === 0 ? 'completed' : i === 1 ? 'processing' : i === 2 ? 'failed' : 'completed',
        senderFeeUsd: 1,
        appFeeUsd: 0.5,
        bridgeFeeUsd: 0.5,
        createdAt: date,
        updatedAt: date,
      });
    } else {
      // Onramp: fiat to crypto
      const sourceInst = await prisma.instrument.create({
        data: {
          ownerType: 'merchant',
          merchantId: MERCHANT_ID,
          kind: 'bank_account',
          assetKey: 'fiat:NGN',
          label: `Test bank ${i}`,
          bankInstitution: 'Access Bank',
          bankAccountName: `Sender ${i}`,
          createdAt: date,
        },
      });
      
      const destInst = await prisma.instrument.create({
        data: {
          ownerType: 'merchant',
          merchantId: MERCHANT_ID,
          kind: 'crypto_wallet',
          assetKey: 'crypto:BASE:USDC',
          label: `Test wallet ${i}`,
          walletAddress: `0x${i}`.padEnd(42, 'a'),
          createdAt: date,
        },
      });
      
      const sourceAmount = 50000 + i * 10000; // NGN
      const destAmount = sourceAmount * 0.000645; // Convert to USD
      
      orders.push({
        clientId: MERCHANT_ID,
        sourceInstrumentId: sourceInst.id,
        destInstrumentId: destInst.id,
        sourceAssetKey: sourceInst.assetKey,
        destAssetKey: destInst.assetKey,
        sourceAmount,
        destAmount,
        quoteRate: 0.000645,
        status: 'completed',
        senderFeeUsd: 2,
        appFeeUsd: 1,
        bridgeFeeUsd: 0,
        createdAt: date,
        updatedAt: date,
      });
    }
  }
  
  // Insert all orders
  for (const order of orders) {
    const created = await prisma.order.create({ data: order });
    console.log(`✓ Created ${created.id} - ${new Date(order.createdAt).toLocaleDateString()}`);
  }
  
  console.log(`\n✅ Created ${orders.length} test orders`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
