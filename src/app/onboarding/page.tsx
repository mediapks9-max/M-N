import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { branding } from "@/lib/branding";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Create your organization" };

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Users who already belong to an organization skip onboarding.
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <p className="mb-8 text-xl font-semibold tracking-tight">
        {branding.productName}
      </p>
      <OnboardingForm />
    </div>
  );
}
