import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Use WebSockets instead of TCP so Neon's compute can auto-suspend between requests.
neonConfig.webSocketConstructor = ws;

function makePrisma() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 1,
    idleTimeoutMillis: 0,   // release connections immediately when idle
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter: new PrismaNeon(pool) });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
