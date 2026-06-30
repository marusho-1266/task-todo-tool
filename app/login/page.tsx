"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "確認メールを送信しました。メール内のリンクから登録を完了してください。",
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          タスク＆Todo管理
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {mode === "login" ? "ログイン" : "新規登録"}
        </p>

        <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {message && (
            <p className="text-sm text-red-600" role="alert">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "登録する"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-500">または</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          Google でログイン
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Google OAuth は Supabase Dashboard でプロバイダを有効化し、環境変数を設定してください（
          <code className="text-zinc-600">doc/setup.md</code> 参照）。
        </p>

        <p className="mt-6 text-center text-sm text-zinc-600">
          {mode === "login" ? (
            <>
              アカウントをお持ちでない方は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage(null);
                }}
                className="font-medium text-zinc-900 underline"
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              すでにアカウントがある方は{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage(null);
                }}
                className="font-medium text-zinc-900 underline"
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
