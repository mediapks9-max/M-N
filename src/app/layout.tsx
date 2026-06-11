import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { branding } from "@/lib/branding";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: branding.productName,
    template: `%s · ${branding.productName}`,
  },
  description: branding.tagline,
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
