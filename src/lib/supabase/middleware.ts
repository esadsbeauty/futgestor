import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  const isPublicPlayerRoute = request.nextUrl.pathname.startsWith("/convite/") || request.nextUrl.pathname.startsWith("/meu-grupo/");
  const isAuth = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/cadastro") || request.nextUrl.pathname.startsWith("/recuperar-senha") || request.nextUrl.pathname.startsWith("/auth");
  if (isPublicPlayerRoute) return response;
  if (!user && !isAuth) return NextResponse.redirect(new URL("/login", request.url));
  if (user && isAuth) return NextResponse.redirect(new URL("/dashboard", request.url));
  return response;
}
