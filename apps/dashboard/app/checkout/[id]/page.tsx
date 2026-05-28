import { notFound } from 'next/navigation';
import SessionCheckoutClient, { type SessionData } from './SessionCheckoutClient';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getSession(id: string): Promise<SessionData | null> {
  try {
    const res = await fetch(`${API_BASE}/checkout/sessions/public/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function CheckoutSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) notFound();

  return <SessionCheckoutClient session={session} />;
}
