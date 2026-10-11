import { notFound } from 'next/navigation';
import CashoutClient from './CashoutClient';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getPayoutLink(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/payout-links/public/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function CashoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getPayoutLink(slug);
  if (!link) notFound();
  return <CashoutClient link={link} />;
}
