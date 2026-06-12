import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { branding } from "@/lib/branding";
import { siteUrl } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: branding.productName,
    template: `%s · ${branding.productName}`,
  },
  description: branding.tagline,
  openGraph: {
    siteName: branding.productName,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
