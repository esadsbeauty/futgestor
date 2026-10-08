import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLegacyPlayerPortal =
    pathname.startsWith("/meu-grupo/") && pathname !== "/meu-grupo/";
  const isInvite = pathname.startsWith("/convite/");
  const isAccountActivation = pathname.startsWith("/ativar-conta/");
  const isAuth =
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/auth");

  if (isInvite || isAccountActivation || isLegacyPlayerPortal) return response;

  if (!user && !isAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isPlayer = user?.user_metadata?.account_type === "player";

  if (user && isAuth) {
    return NextResponse.redirect(
      new URL(isPlayer ? "/meu-grupo" : "/dashboard", request.url)
    );
  }

  if (user && isPlayer && pathname !== "/meu-grupo" && pathname !== "/nova-senha") {
    return NextResponse.redirect(new URL("/meu-grupo", request.url));
  }

  if (user && !isPlayer && pathname === "/meu-grupo") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
