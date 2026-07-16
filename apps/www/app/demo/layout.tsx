import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo | Weave",
  description: "Try the real Weave checkout — pay by bank transfer or crypto wallet and settle instantly in Naira or USDC.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Live Demo | Weave",
    description: "Try the real Weave checkout — pay by bank transfer or crypto wallet and settle instantly in Naira or USDC.",
    url: "/demo",
    siteName: "Weave",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Demo | Weave",
    description: "Try the real Weave checkout — pay by bank transfer or crypto wallet and settle instantly in Naira or USDC.",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
