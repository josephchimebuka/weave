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
  title: "Weave | Bridge Fiat & Crypto Seamlessly",
  description: "Accept global crypto payments and settle instantly in local fiat. The ultimate bridge between traditional banking and the future of finance.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Weave | Bridge Fiat & Crypto Seamlessly",
    description: "Accept global crypto payments and settle instantly in local fiat.",
    url: baseUrl,
    siteName: "Weave",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave | Bridge Fiat & Crypto Seamlessly",
    description: "Accept global crypto payments and settle instantly in local fiat.",
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
      description: "Accept global crypto payments and settle instantly in local fiat.",
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
