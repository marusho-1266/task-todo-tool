# task-todo-tool

バックログ（タスク）と今日の時間割（Todo）を一気通貫で管理する Web アプリ。

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [doc/product-spec.md](./doc/product-spec.md) | プロダクト仕様（正本） |
| [doc/database-schema.md](./doc/database-schema.md) | DB スキーマ |
| [doc/development-roadmap.md](./doc/development-roadmap.md) | 開発ロードマップ |
| [doc/setup.md](./doc/setup.md) | **ローカル / Vercel / Supabase セットアップ** |

## クイックスタート

```bash
npm install
cp .env.local.example .env.local
# .env.local に Supabase URL / anon key を設定（doc/setup.md 参照）
npm run dev
```

Supabase プロジェクト作成と `supabase db push` は [doc/setup.md](./doc/setup.md) の手順に従ってください。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run format` | Prettier フォーマット |

## 技術スタック（P0）

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- `@supabase/supabase-js` + `@supabase/ssr`
