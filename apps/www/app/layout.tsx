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

export const metadata: Metadata = {
  title: "Weave | Bridge Fiat & Crypto Seamlessly",
  description: "Accept global crypto payments and settle instantly in local fiat. The ultimate bridge between traditional banking and the future of finance.",
  openGraph: {
    title: "Weave | Bridge Fiat & Crypto Seamlessly",
    description: "Accept global crypto payments and settle instantly in local fiat.",
    url: "https://weave.finance",
    siteName: "Weave",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Weave - Financial Connectivity, Seamlessly Interwoven",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weave | Bridge Fiat & Crypto Seamlessly",
    description: "Accept global crypto payments and settle instantly in local fiat.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
