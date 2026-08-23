import type { Metadata, Viewport } from "next";
import { GeistMono } from 'geist/font/mono'
import { Bricolage_Grotesque } from 'next/font/google'
import { Toaster } from "@/components/ui/sonner";
import { Providers } from '@shared/providers/Providers'
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-bricolage',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KISTA',
  description: 'Key Investment Strategy & Trading Automation — 핵심 투자 전략 및 매매 자동화',
  manifest: '/manifest.webmanifest',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KISTA',
  },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${GeistMono.variable} ${bricolageGrotesque.variable}`}>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
