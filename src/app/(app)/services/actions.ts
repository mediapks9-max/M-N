"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

export interface ServiceInput {
  name: string;
  color: string;
  description: string;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validateServiceInput(input: ServiceInput): string | null {
  if (!input.name.trim()) {
    return "Service name is required.";
  }
  if (!HEX_COLOR.test(input.color)) {
    return "Color must be a hex value like #22c55e.";
  }
  return null;
}

export async function createServiceAction(
  orgId: string,
  input: ServiceInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const validationError = validateServiceInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const baseSlug = slugify(input.name);

  const { data: existing } = await supabase
    .from("services")
    .select("slug, sort_order")
    .eq("organization_id", orgId);

  const slugs = new Set(
    (existing ?? []).map((s: { slug: string }) => s.slug)
  );
  let slug = baseSlug;
  let n = 1;
  while (slugs.has(slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
  const maxSort = Math.max(
    0,
    ...(existing ?? []).map((s: { sort_order: number }) => s.sort_order)
  );

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      organization_id: orgId,
      name: input.name.trim(),
      slug,
      color: input.color,
      description: input.description.trim(),
      sort_order: maxSort + 1,
    })
    .select("id, name")
    .single();

  if (error || !service) {
    return { error: error?.message ?? "Could not create the service." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "service",
    entityId: service.id,
    entityLabel: service.name,
    action: "created",
  });

  revalidatePath("/services");
  return {};
}

export async function updateServiceAction(
  orgId: string,
  serviceId: string,
  input: ServiceInput
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const validationError = validateServiceInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const { data, error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      color: input.color,
      description: input.description.trim(),
    })
    .eq("id", serviceId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Service not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "service",
    entityId: serviceId,
    entityLabel: data[0].name,
    action: "updated",
  });

  revalidatePath("/services");
  return {};
}

export async function toggleServiceActiveAction(
  orgId: string,
  serviceId: string,
  isActive: boolean
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId)
    .eq("organization_id", orgId)
    .select("id, name");

  if (error) {
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Service not found." };
  }

  await logActivity({
    organizationId: orgId,
    entityType: "service",
    entityId: serviceId,
    entityLabel: data[0].name,
    action: "updated",
    details: { is_active: isActive },
  });

  revalidatePath("/services");
  return {};
}

export async function moveServiceAction(
  orgId: string,
  serviceId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: services, error } = await supabase
    .from("services")
    .select("id, sort_order")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });

  if (error || !services) {
    return { error: error?.message ?? "Could not load services." };
  }

  const index = services.findIndex(
    (s: { id: string }) => s.id === serviceId
  );
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= services.length) {
    return {};
  }

  const a = services[index];
  const b = services[swapWith];

  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase
      .from("services")
      .update({ sort_order: b.sort_order })
      .eq("id", a.id)
      .eq("organization_id", orgId),
    supabase
      .from("services")
      .update({ sort_order: a.sort_order })
      .eq("id", b.id)
      .eq("organization_id", orgId),
  ]);

  if (errorA || errorB) {
    return { error: (errorA ?? errorB)?.message };
  }

  revalidatePath("/services");
  return {};
}
