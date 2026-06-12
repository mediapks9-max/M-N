"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFirstTouch, getVisitorId } from "@/lib/tracking";

interface LeadFormProps {
  title?: string;
  description?: string;
  /** Tag for leads from embedded forms on external sites. */
  source?: string;
  /** Route the lead to a specific organization (embeds on client sites). */
  orgSlug?: string;
}

export function LeadForm({
  title = "Get in touch",
  description = "Tell us what you're working on — we'll get back to you within one business day.",
  source,
  orgSlug,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const firstTouch = getFirstTouch();
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          message,
          visitor: getVisitorId(),
          ...firstTouch,
          ...(source
            ? { site: source, landing_page: firstTouch.landing_page || source }
            : {}),
          ...(orgSlug ? { org_slug: orgSlug } : {}),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thanks — we got it! ✅</CardTitle>
          <CardDescription>
            We&apos;ll be in touch shortly at {email}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <p className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leadName">Name</Label>
              <Input
                id="leadName"
                required
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadEmail">Email</Label>
              <Input
                id="leadEmail"
                type="email"
                required
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadPhone">Phone (optional)</Label>
            <Input
              id="leadPhone"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhone(e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadMessage">How can we help?</Label>
            <Textarea
              id="leadMessage"
              rows={3}
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setMessage(e.target.value)
              }
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending…" : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
