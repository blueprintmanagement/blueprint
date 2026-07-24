"use client";

import { assertSupabaseConfigured } from "@/lib/supabase/client";

export type OrganizationRole = "owner" | "admin" | "manager" | "viewer";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMembershipRow = {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
  organizations?: OrganizationRow;
};

type RawOrganizationMembershipRow = Omit<OrganizationMembershipRow, "organizations"> & {
  organizations?: OrganizationRow | OrganizationRow[] | null;
};

export async function fetchUserOrganizations() {
  const supabase = assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id,user_id,role,created_at,organizations(id,name,slug,created_by,created_at,updated_at)")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as RawOrganizationMembershipRow[]).map((membership) => ({
    ...membership,
    organizations: Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations ?? undefined,
  }));
}

export async function createOrganization(name: string, slug: string) {
  const supabase = assertSupabaseConfigured();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw sessionError ?? new Error("Sessão ausente.");
  }

  const response = await fetch("/api/organizations", {
    body: JSON.stringify({
      name: name.trim(),
      slug: slug.trim(),
    }),
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json()) as {
    error?: string;
    id?: string;
  };

  if (!response.ok || !payload.id) {
    throw new Error(payload.error ?? "Não foi possível criar a empresa.");
  }

  return payload.id;
}
