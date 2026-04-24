import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateKeyPair() {
  const publicKey = 'pk_' + crypto.randomBytes(24).toString('hex');
  const secretKey = 'sk_' + crypto.randomBytes(32).toString('hex');
  return { publicKey, secretKey };
}

async function main() {
  const MERCHANT_EMAIL = 'merchant@weave.dev';
  const MERCHANT_ID = '35c381e8-adbb-4c17-8dad-1480e5c13f3c';

  console.log(`Setting up API keys for merchant ${MERCHANT_EMAIL}...`);

  // Find or create the user
  let user = await prisma.user.findUnique({ where: { email: MERCHANT_EMAIL } });
  if (!user) {
    console.error(`❌ User ${MERCHANT_EMAIL} not found. Create the user first via signup.`);
    process.exit(1);
  }

  console.log(`✓ Found user: ${user.id}`);

  // Check if client exists
  let client = await prisma.client.findUnique({ where: { id: MERCHANT_ID } });
  if (!client) {
    console.log(`ℹ Client ${MERCHANT_ID} not found, creating...`);
    const { publicKey, secretKey } = generateKeyPair();
    const combinedKey = `${publicKey}|${secretKey}`;
    client = await prisma.client.create({
      data: {
        id: MERCHANT_ID,
        name: 'Test Merchant',
        apiKey: combinedKey,
        userId: user.id,
      },
    });
    console.log(`✓ Created client with API key pair`);
  } else {
    console.log(`✓ Found existing client: ${client.id}`);
    if (!client.userId) {
      console.log(`ℹ Linking user to client...`);
      client = await prisma.client.update({
        where: { id: MERCHANT_ID },
        data: { userId: user.id },
      });
      console.log(`✓ Linked user to client`);
    }
  }

  const [publicKey, secretKey] = client.apiKey.includes('|') 
    ? client.apiKey.split('|') 
    : [`pk_${client.apiKey.slice(0, 24)}`, client.apiKey];

  console.log(`\n✅ Setup complete!`);
  console.log(`📝 Client ID: ${client.id}`);
  console.log(`🔑 Public Key: ${publicKey}`);
  console.log(`🔐 Secret Key: ${secretKey}`);
  console.log(`\nThe merchant can now use these keys with the widget.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
