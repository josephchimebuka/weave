import { Client, Receiver } from '@upstash/qstash';

const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY || '';
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY || '';

if (!QSTASH_TOKEN && process.env.NODE_ENV === 'production') {
  console.warn('[qstash] Missing QSTASH_TOKEN. Background jobs will fail.');
}

/**
 * Standard QStash client for publishing background jobs.
 */
export const qstash = new Client({
  token: QSTASH_TOKEN,
});

/**
 * Receiver for verifying QStash signatures on incoming job endpoints.
 */
export const qstashReceiver = new Receiver({
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});
