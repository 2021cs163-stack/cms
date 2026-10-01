import { createClient } from "npm:@supabase/supabase-js@2";
export function headers(req: Request) {
  const origins = (Deno.env.get("APP_ORIGIN") || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const requestOrigin = req.headers.get("origin");
  return {
    // Without an allowlist, bearer-token authentication still protects every POST.
    // Return preflight headers even when configuration is missing.
    "Access-Control-Allow-Origin": requestOrigin || origins[0] || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}
export function server() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function authorize(req: Request) {
  const origins = (Deno.env.get("APP_ORIGIN") || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const requestOrigin = req.headers.get("origin");
  if (requestOrigin && origins.length && !origins.includes(requestOrigin))
    throw new Error("Origin not allowed. Add this frontend URL to APP_ORIGIN in Edge Function secrets.");
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Error("Authentication required");
  const client = server();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(authorization.slice(7));
  if (error || !user) throw new Error("Authentication required");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role,status,must_change_password")
    .eq("id", user.id)
    .single();
  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.status !== "active" ||
    profile.must_change_password
  )
    throw new Error("Administrator access required");
  return { client, user };
}
export function response(
  body: unknown,
  status: number,
  cors: Record<string, string>,
) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 30_000) throw new Error("Request is too large");
  return JSON.parse(raw);
}
