import DemoClient from './DemoClient';

// Read env on the server each request so Preview deploys pick up Vercel vars
// without relying on NEXT_PUBLIC_* baked into an old client bundle.
export const dynamic = 'force-dynamic';

export default function DemoPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000/api/v1';
  const apiKey =
    process.env.WEAVE_DEMO_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_API_KEY?.trim() ||
    '';

  return <DemoClient apiUrl={apiUrl} apiKey={apiKey} />;
}
