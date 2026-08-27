import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Supabase Auth へのリクエストを打ち切るまでの時間。
// Node ランタイムの fetch は既定のタイムアウトを持たないため、応答が返らない
// コネクションを掴むと middleware が返らなくなり Vercel 側で
// MIDDLEWARE_INVOCATION_TIMEOUT (504) になる。それを防ぐために明示的に打ち切る。
const AUTH_FETCH_TIMEOUT_MS = 3000;

// このミリ秒を超えた認証チェックは、504 に至らなくても兆候として記録する。
const AUTH_SLOW_THRESHOLD_MS = 1000;

/**
 * タイムアウト付きの fetch。呼び出し元が signal を渡してきた場合は両方を尊重する。
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(AUTH_FETCH_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  }

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  // 認証チェックの所要時間を計測する。ハングした場合にどこで止まったかを
  // Vercel の Runtime Logs から特定できるようにするため。
  const startedAt = Date.now();
  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // セッション未確立は通常フロー(未ログイン)なので警告しない。
      if (error.name !== "AuthSessionMissingError") {
        console.warn(
          `[middleware] auth.getUser failed path=${pathname} elapsed=${Date.now() - startedAt}ms error=${error.name}: ${error.message}`,
        );
      }
    } else {
      user = data.user;
    }
  } catch (e) {
    // fetch のタイムアウト/ネットワーク断はここに来る。
    // ここで握り潰さないと middleware が例外のまま 500 を返してしまう。
    const err = e as Error;
    console.error(
      `[middleware] auth.getUser threw path=${pathname} elapsed=${Date.now() - startedAt}ms error=${err?.name}: ${err?.message}`,
    );
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed >= AUTH_SLOW_THRESHOLD_MS) {
    console.warn(
      `[middleware] slow auth check path=${pathname} elapsed=${elapsed}ms`,
    );
  }

  const isLoginPage = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPublicPage = pathname.startsWith("/lp");

  if (!user && !isLoginPage && !isAuthCallback && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
