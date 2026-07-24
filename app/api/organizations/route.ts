import { NextResponse } from "next/server";
import { createSupabaseAdminClient, readLimitedJson } from "@/lib/supabase/admin";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return NextResponse.json({ error: "Sessao ausente." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await readLimitedJson(request);
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const { name, slug } = payload as {
    name?: string;
    slug?: string;
  };
  const normalizedName = name?.trim() ?? "";
  const baseSlug = slugify(slug || normalizedName);

  if (normalizedName.length < 2 || normalizedName.length > 80 || !baseSlug) {
    return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult.user) {
      return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
    }

    const user = userResult.user;
    const { error: profileError } = await supabase.from("profiles").upsert({
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      id: user.id,
    });

    if (profileError) {
      return NextResponse.json({ error: "Nao foi possivel preparar o perfil." }, { status: 400 });
    }

    const { count: organizationCount, error: countError } = await supabase
      .from("organization_members")
      .select("organization_id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json({ error: "Nao foi possivel validar suas empresas." }, { status: 400 });
    }

    if ((organizationCount ?? 0) >= 3) {
      return NextResponse.json({ error: "Limite de empresas atingido para este MVP." }, { status: 403 });
    }

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const candidateSlug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .insert({
          created_by: user.id,
          name: normalizedName,
          slug: candidateSlug,
        })
        .select("id")
        .single();

      if (organizationError) {
        lastError = organizationError;
        continue;
      }

      const { error: membershipError } = await supabase.from("organization_members").insert({
        organization_id: organization.id,
        role: "owner",
        user_id: user.id,
      });

      if (membershipError) {
        await supabase.from("organizations").delete().eq("id", organization.id);
        return NextResponse.json({ error: "Nao foi possivel vincular a empresa ao usuario." }, { status: 400 });
      }

      return NextResponse.json({ id: organization.id });
    }

    return NextResponse.json(
      {
        error:
          lastError instanceof Error
            ? lastError.message
            : "Nao foi possivel criar a empresa.",
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "Nao foi possivel criar a empresa agora." }, { status: 500 });
  }
}
