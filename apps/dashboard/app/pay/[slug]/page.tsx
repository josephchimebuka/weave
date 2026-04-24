import { notFound } from 'next/navigation';
import PayClient from './PayClient';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getLink(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/links/public/${slug}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function PayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const link = await getLink(slug);

  if (!link) {
    notFound();
  }

  return <PayClient link={link} />;
}
