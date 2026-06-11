import Link from "next/link";

import { branding } from "@/lib/branding";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <Link
        href="/"
        className="mb-8 text-xl font-semibold tracking-tight"
      >
        {branding.productName}
      </Link>
      {children}
    </div>
  );
}
