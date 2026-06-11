import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { branding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-invite-button";

export const metadata = { title: "You're invited" };

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <p className="mb-8 text-xl font-semibold tracking-tight">
        {branding.productName}
      </p>
      {children}
    </div>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: details }, { data: userData }] = await Promise.all([
    supabase.rpc("get_invite_details", { invite_token: token }),
    supabase.auth.getUser(),
  ]);

  const invite = details?.[0];
  const user = userData.user;

  if (!invite) {
    return (
      <InviteShell>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>
              This invite link is invalid. Ask the person who invited you to
              send a new one.
            </CardDescription>
          </CardHeader>
        </Card>
      </InviteShell>
    );
  }

  if (invite.is_accepted || invite.is_expired) {
    return (
      <InviteShell>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              {invite.is_accepted ? "Invite already used" : "Invite expired"}
            </CardTitle>
            <CardDescription>
              {invite.is_accepted
                ? "This invite has already been accepted."
                : "This invite link has expired."}{" "}
              Ask an admin of {invite.organization_name} to send a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {invite.organization_name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <strong>{invite.organization_name}</strong> as{" "}
            {invite.role === "admin" ? "an admin" : "a member"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Log in or create an account with{" "}
                <strong>{invite.email}</strong> to accept.
              </p>
              <Button asChild className="w-full">
                <Link
                  href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Create account
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link
                  href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                >
                  Log in
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </InviteShell>
  );
}
