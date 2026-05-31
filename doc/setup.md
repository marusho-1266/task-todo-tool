# セットアップ手順（P0）

ローカル開発および Vercel / Supabase リモート環境の構築手順です。  
**シークレット（API キー等）はリポジトリにコミットしないでください。**

---

## 1. 前提

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)（`npx supabase` でも可）
- （任意）Docker Desktop — ローカル Supabase 用

---

## 2. アプリのローカル起動

```bash
npm install
cp .env.local.example .env.local
# .env.local に Supabase の URL / anon key を設定（§3 参照）
npm run dev
```

http://localhost:3000 にアクセス。未ログイン時は `/login` へリダイレクトされます。

---

## 3. Supabase プロジェクト作成（手動・P0-03）

1. [Supabase Dashboard](https://supabase.com/dashboard) で **新規プロジェクト** を作成（dev 用）
2. **Project Settings → API** から以下を取得:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `.env.local` に設定

### 認証プロバイダ（P0-12）

**Authentication → Providers**

| プロバイダ | 設定 |
|-----------|------|
| **Email** | 有効化。MVP は **メール + パスワード** |
| **Google** | 有効化。Google Cloud Console で OAuth クライアント ID / Secret を設定 |

**Authentication → URL Configuration**

| 環境 | Site URL | Redirect URLs |
|------|----------|---------------|
| ローカル | `http://localhost:3000` | `http://localhost:3000/auth/callback` |
| Vercel Preview | `https://<preview>.vercel.app` | `https://<preview>.vercel.app/auth/callback` |
| 本番 | `https://your-domain.com` | `https://your-domain.com/auth/callback` |

---

## 4. DB マイグレーション適用（P0-04〜P0-11）

マイグレーションは `supabase/migrations/` に SQL として管理されています。

### リモート Supabase へ push（推奨）

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` で以下が適用されます:

- MVP テーブル: `profiles`, `projects`, `tasks`, `todos`, `work_sessions`
- 全テーブル RLS（`auth.uid() = user_id`）
- サインアップ trigger（profile + Inbox / 問合せ・差し込み 自動作成）

### ローカル Supabase（任意）

Docker が起動している場合:

```bash
npx supabase start
npx supabase db reset   # マイグレーションを再適用
```

ローカル API URL / anon key は `npx supabase status` で確認し `.env.local` に設定。

---

## 5. 動作確認チェックリスト

- [ ] `/login` でメール + パスワード登録・ログイン
- [ ] ログイン後 `/` に遷移
- [ ] システムプロジェクト「Inbox」「問合せ・差し込み」が表示される
- [ ] 未ログインで `/` にアクセス → `/login` へリダイレクト
- [ ] （任意）別ユーザー 2 件作成し、互いの `projects` が見えないこと（RLS）

---

## 6. Vercel 連携（P0-13・手動）

1. [Vercel](https://vercel.com) で GitHub リポジトリを Import
2. **Environment Variables** に設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Production / Preview それぞれに同じ変数を設定（後述 P0-14 で DB を分ける場合は URL を環境ごとに変更）
4. PR 作成 → Preview URL でログイン動作を確認

---

## 7. Staging / 本番 Supabase 分離（P0-14・手動）

| 環境 | Git ブランチ | Supabase プロジェクト | Vercel 環境 |
|------|-------------|----------------------|-------------|
| **Preview / Staging** | PR / `develop` 等 | staging 用プロジェクト | Preview |
| **Production** | `main` | production 用プロジェクト | Production |

手順:

1. Supabase で **staging** と **production** の 2 プロジェクトを作成
2. 各プロジェクトで `supabase link` + `supabase db push`（同一マイグレーション）
3. Vercel の Preview 環境変数 → staging の URL / anon key
4. Vercel の Production 環境変数 → production の URL / anon key
5. 各 Supabase プロジェクトの Auth Redirect URL に Vercel の URL を登録

---

## 8. 参照

- [database-schema.md](./database-schema.md) — テーブル定義
- [development-roadmap.md](./development-roadmap.md) — P0 タスク一覧
- [product-spec.md](./product-spec.md) §11 — 認証・技術スタック
