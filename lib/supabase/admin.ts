import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Supabase admin env ausente.");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function readLimitedJson(request: Request, maxBytes = 4096) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maxBytes) {
    throw new Error("Payload muito grande.");
  }

  const text = await request.text();

  if (text.length > maxBytes) {
    throw new Error("Payload muito grande.");
  }

  return JSON.parse(text) as unknown;
}
