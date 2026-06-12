import { LeadForm } from "@/components/site/lead-form";

export const metadata = {
  title: "Contact form",
  robots: { index: false },
};

interface EmbedLeadFormPageProps {
  searchParams: Promise<{ site?: string; title?: string }>;
}

/**
 * Minimal, embeddable lead form for external (client) websites:
 *
 *   <iframe src="https://YOUR-DOMAIN/embed/lead-form?site=waveroi.biz"
 *           style="width:100%;max-width:540px;height:560px;border:0"
 *           loading="lazy"></iframe>
 *
 * Submissions appear in the Leads screen tagged with the site they
 * came from.
 */
export default async function EmbedLeadFormPage({
  searchParams,
}: EmbedLeadFormPageProps) {
  const { site, title } = await searchParams;

  return (
    <div className="mx-auto max-w-xl p-4">
      <LeadForm
        source={site || "embed"}
        title={title || "Get in touch"}
        description="Tell us what you're working on — we'll get back to you within one business day."
      />
    </div>
  );
}
