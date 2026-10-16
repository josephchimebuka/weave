import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

const baseUrl = "https://paywithweave.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Weave | Unified checkout & payments",
  description: "One checkout for bank, card, and wallet payments. Merchants embed Weave, share payment links, and settle in Naira or stablecoins.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Weave | Unified checkout & payments",
    description: "One checkout for bank, card, and wallet. Settle in Naira or stablecoins.",
    url: baseUrl,
    siteName: "Weave",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave | Unified checkout & payments",
    description: "One checkout for bank, card, and wallet. Settle in Naira or stablecoins.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "Weave",
      url: baseUrl,
      logo: `${baseUrl}/icon`,
      description: "A product by Dewdrop Labs.",
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "Weave",
      description: "Unified checkout and payments for merchants — bank, card, wallet, and payment links.",
      publisher: { "@id": `${baseUrl}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
