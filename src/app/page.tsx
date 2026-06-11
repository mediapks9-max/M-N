import Link from "next/link";
import { BarChart3, FileText, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { branding } from "@/lib/branding";

const features = [
  {
    title: "One view of every engagement",
    description:
      "Clients × services at a glance: who you're working for, what's running, and what's due next.",
    icon: LayoutGrid,
  },
  {
    title: "Deliverables & content pipeline",
    description:
      "Track audits, websites, SEO articles and reports from planned to published — nothing slips.",
    icon: FileText,
  },
  {
    title: "Invoices & profitability",
    description:
      "Client and supplier invoices linked to engagements, with revenue, cost and profit per month.",
    icon: BarChart3,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-semibold tracking-tight">
            {branding.productName}
          </span>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-6 py-24 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Run your agency&apos;s entire service activity in one place
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Engagements, deliverables, SEO content, invoices and reports —
            built for marketing agencies and freelancers.
          </p>
          <div className="mt-10">
            <Button size="lg" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-muted-foreground" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          {branding.productName}
        </p>
      </footer>
    </div>
  );
}
