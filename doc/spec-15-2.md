# Spec: システムレビュー対応(即効性の高い3件)

- 元レビュー: `doc/system-review-2026-07.md`(2026-07-07 実施)
- 対象ブランチ: `marusho-1266/issue15`
- スコープ: レビューまとめで「即効性が高い」とされた 3 件のみ

## Objective

2026-07 のシステムレビューで指摘された項目のうち、費用対効果が最も高い 3 件を対応する。

1. **セキュリティ**: `supabasepass.md` が git 管理下にあり、認証情報漏洩リスクがある → 追跡除外 + 認証情報ローテーション
2. **速度**: Google Calendar API 呼び出しが `app/page.tsx` の `Promise.all` に含まれ、毎回のページ表示・`router.refresh()` をブロックしている → トグル ON 時のクライアント遅延取得 + クライアント側キャッシュに変更
3. **UI**: 日次タイムラインに現在時刻の表示がない → 現在時刻ライン(赤)+ 初期表示時の自動スクロールを追加

## 前提・確認済み事項

- `supabasepass.md` は `git ls-files` で追跡下にあることを確認済み(内容は未読・読まない)。リモート(GitHub)に push 済みの履歴があるため、**漏洩済みとみなしローテーション必須**。
- GCal トグルの localStorage 永続化(レビュー UI 改善 6)は `components/dashboard/GoogleCalendarToggle.tsx` で**実装済み**のため対象外。
- Next.js は **16.2.6**。`unstable_cache` は非推奨(`use cache` + `cacheComponents` へ移行推奨)だが、本アプリは `force-dynamic` + Cookie(Supabase セッション)依存のため `cacheComponents` 有効化は影響範囲が大きい。よってサーバー側キャッシュではなく**クライアント側の遅延取得 + 日付単位キャッシュ**を採用する(トグル OFF 時はそもそも取得しない、`router.refresh()` でも再取得しない、という副次効果も得られる)。

## 変更方針

### 1. `supabasepass.md` のセキュリティ対処

手順(コード変更ではなく運用作業を含む):

1. `git rm --cached supabasepass.md` で追跡から外す(ワーキングコピーは残す)
2. `.gitignore` に `supabasepass.md` を追加
3. 上記をコミット(ユーザー承認後)
4. **ユーザー作業**: Supabase ダッシュボードで DB パスワード / 該当キーをローテーションする(履歴に残った内容は漏洩済み扱い)

注意: 本作業中、エージェントは `supabasepass.md` の内容を読まない・出力しない。

### 2. Google Calendar 取得の非ブロック化

現状: `app/page.tsx:89` で `fetchCalendarEvents(dateStr)` を `Promise.all` に含めており、Google API の応答時間(数百 ms〜)が毎回ページ表示と全操作後の `router.refresh()` に乗る。トグル OFF でも取得している(`DashboardClient.tsx:315` で表示だけ抑制)。

変更後:

- `app/page.tsx` から `fetchCalendarEvents` の呼び出しを削除。`hasProviderToken` のみ渡す(既存 prop 維持)。
- `DashboardClient` 側で、`gcalEnabled === true` かつ `hasProviderToken` のときに `useEffect` から Server Action `fetchCalendarEvents(dateStr)` を直接呼び出す(Server Action は "use server" のためクライアントから呼び出し可能)。
- 取得結果は `useRef` の `Map<dateStr, { events, fetchedAt }>` にキャッシュし、同一日付は **TTL 5 分**以内なら再取得しない。日付切り替え・トグル ON で必要時のみ取得。
- 取得中はカレンダーブロック非表示のままで良い(スピナー等は不要。到着次第表示)。
- `calendarEvents` prop と `DashboardClient` 内の受け渡しは client-state に置き換える。`Timeline` への `calendarEvents` の渡し方(`gcalEnabled ? events : []`)は維持。

### 3. 現在時刻ライン + 自動スクロール

- `components/timeline/Timeline.tsx` に現在時刻インジケーターを追加:
  - 表示条件: 表示中の日付が今日(JST、`isToday` 相当)かつ現在時刻が 06:00–22:00(`TIMELINE_START_HOUR`–`TIMELINE_END_HOUR`)の範囲内
  - 位置: `(現在JST分 − TIMELINE_START_HOUR*60) * PX_PER_MINUTE`(`lib/time.ts` の既存定数を使用)
  - 見た目: 赤い水平線(`z-index` はブロックより上、`pointer-events-none`)+ 左端に小さい丸ドット。テーマ対応(paper/ink 系トークンと調和する赤系)。
  - 更新: `setInterval` 60 秒毎に再計算(クライアントコンポーネント内、unmount 時に clear)
  - JST 計算は `lib/time.ts` の既存パターン(UTC + 9h オフセット)に合わせる。必要なら「現在のJST分(タイムライン起点からの分)」を返すヘルパーを `lib/time.ts` に追加。
- 自動スクロール:
  - 初期マウント時、今日を表示している場合のみ、現在時刻ラインがビューポートの上から 1/3 程度に来るよう `timelineRef` のスクロールコンテナを `scrollTo`(`behavior: "auto"`、初回のみ)
  - 日付を切り替えて今日に戻った場合もスクロールするかは実装時に軽量な方(今日への遷移時に再実行)を採用

## Tech Stack

- Next.js 16.2.6 (App Router) / React 19 / TypeScript
- Tailwind CSS v4(CSS 変数によるテーマトークン)
- Supabase(`@supabase/ssr`、Server Actions 経由)

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`(vitest run)
- Lint: `npm run lint`
- Format: `npm run format:check`

## Project Structure(関連部分)

```
app/page.tsx                          → サーバーコンポーネント(6クエリ + GCal取得) ← 変更
app/actions/google-calendar.ts        → fetchCalendarEvents Server Action(変更なし想定)
components/dashboard/DashboardClient.tsx → クライアント側の状態管理 ← 変更(遅延取得)
components/dashboard/GoogleCalendarToggle.tsx → トグル(localStorage永続化済み・変更なし)
components/timeline/Timeline.tsx      → タイムライン描画 ← 変更(現在時刻ライン)
lib/time.ts                           → JST/タイムライン定数・ヘルパー ← ヘルパー追加の可能性
lib/__tests__/ または *.test.ts       → vitest(lib のユニットテスト)
```

## Code Style

既存コードに準拠: 関数コンポーネント + hooks、Tailwind クラス + インライン style(px 計算)、`lib/` の純粋関数はエクスポート定数を共有。コメントは日本語可(既存に倣う)。

```tsx
const nowOffsetMinutes = getNowTimelineMinutes(); // タイムライン起点(06:00)からの分
const topPx = nowOffsetMinutes * PX_PER_MINUTE;
```

## Testing Strategy

- フレームワーク: vitest(既存)。UI の自動テストはないため、時刻計算ヘルパー(`lib/time.ts` に追加する関数)のみユニットテストを追加。
- 手動確認項目:
  - **項目1**: `git ls-files | grep supabasepass` が空になる。ファイル自体はローカルに残る。`git status` で untracked にならない(.gitignore 効果)
  - **項目2**: トグル OFF でページ表示時に Google API が呼ばれない(Network タブ / サーバーログ)。トグル ON で予定が表示される。ブロック移動等の操作後(`router.refresh()`)にカレンダー再取得が走らない。日付切替で該当日の予定が出る
  - **項目3**: 今日表示時に赤ラインが現在時刻位置に出る。初期表示で現在時刻付近へスクロールされる。過去/未来の日付ではライン非表示。1 分経過でラインが動く

## Boundaries

- **Always**: 変更前後で `npm run lint` と `npm test` を通す。JST 処理は `lib/time.ts` の既存パターンに従う。オプティミスティック更新の既存挙動を壊さない
- **Ask first**: `fetchCalendarEvents` のシグネチャ変更、`cacheComponents` の有効化、依存パッケージ追加、DB スキーマ変更、commit / push
- **Never**: `supabasepass.md` / `.env*` の内容を読む・会話やログに出力する。`git push --force` 等の履歴改変。git 履歴からのファイル削除(ローテーションで対処する方針のため)

## Success Criteria

1. `supabasepass.md` が git 追跡外になり `.gitignore` に登録されている(+ ユーザーによるローテーション実施)
2. 初期表示および全ての Server Action 後の `router.refresh()` で Google Calendar API が呼ばれない(トグル ON の初回とキャッシュ失効時のみ呼ばれる)
3. 今日のタイムラインに現在時刻ラインが表示され 1 分毎に更新される。初期表示で現在時刻へ自動スクロールする
4. `npm run build`・`npm test`・`npm run lint` がすべて成功する

## Open Questions

1. Supabase 認証情報のローテーションはユーザー側作業になるが、タイミングはコミット前後どちらでも良いか?(推奨: 対処コミット後すぐ)
2. 自動スクロールの位置(現在時刻を上から 1/3 に置く)で良いか? 中央寄せの好みがあれば指定を。
3. GCal キャッシュ TTL 5 分で良いか?(レビュー提案の 1〜5 分の上限を採用)
