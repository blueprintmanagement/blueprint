import { NextResponse } from "next/server";
import { createSupabaseAdminClient, readLimitedJson } from "@/lib/supabase/admin";

function isLocalRequest(request: Request) {
  const host = request.headers.get("host") ?? "";

  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || !isLocalRequest(request)) {
    return NextResponse.json({ error: "Cadastro de desenvolvimento indisponivel." }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await readLimitedJson(request);
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const { email, fullName, password } = payload as {
    email?: string;
    fullName?: string;
    password?: string;
  };

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const normalizedName = fullName?.trim() ?? "";

  if (
    !normalizedName ||
    normalizedName.length > 80 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    !password ||
    password.length < 8 ||
    password.length > 128
  ) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: normalizedName,
      },
    });

    if (error) {
      return NextResponse.json({ error: "Nao foi possivel criar a conta." }, { status: 400 });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      email: normalizedEmail,
      full_name: normalizedName,
      id: data.user.id,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Nao foi possivel preparar o perfil." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Cadastro de desenvolvimento indisponivel." }, { status: 500 });
  }
}
