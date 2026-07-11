# Implementation Plan: システムレビュー対応(即効性の高い3件)

- 対象 spec: `doc/spec-15-2.md`
- ブランチ: `marusho-1266/issue15`

## Overview

①`supabasepass.md` の git 追跡除外(セキュリティ)、②Google Calendar 取得のクライアント遅延化(速度)、③現在時刻ライン + 自動スクロール(UI)の 3 件を、独立した縦切りタスクとして順に実装する。各タスクは互いに依存しないため、リスクの高い順(セキュリティ → 速度 → UI)に実施する。

## Architecture Decisions

- **GCal はサーバーキャッシュではなくクライアント遅延取得**: Next.js 16 で `unstable_cache` は非推奨、後継の `use cache` は `cacheComponents` 有効化が必要で `force-dynamic` + Cookie 依存の本アプリには影響大。クライアント側で Server Action を直接呼び、`useRef` の `Map<dateStr, {events, fetchedAt}>`(TTL 5 分)でキャッシュする。
- **現在時刻ラインはマウント後にのみ描画**: SSR と時刻がずれるため、hydration mismatch を避ける(`mounted` フラグ or 初期値 null)。
- **時刻計算は `lib/time.ts` に純粋関数として追加**し、vitest でユニットテスト(既存の `lib/*.test.ts` 同居パターンに従う)。
- **git 履歴の書き換えはしない**: 認証情報ローテーションで漏洩リスクに対処(spec の Never 準拠)。

## Task List

### Phase 1: セキュリティ

#### Task 1: `supabasepass.md` を git 追跡から除外

**Description:** `git rm --cached` で追跡を外し、`.gitignore` に追加する。ファイル内容は読まない・出力しない。コミットはユーザー承認を得てから行う。

**Acceptance criteria:**
- [x] `git ls-files | grep supabasepass` が空
- [x] ローカルのファイル自体は残っている
- [x] `.gitignore` に `supabasepass.md` が記載され、`git status` で untracked と表示されない

**Verification:**
- [x] `git ls-files | grep -i supabasepass`(出力なし)
- [x] `git status --short`(supabasepass.md が現れない)

**Dependencies:** None
**Files likely touched:** `.gitignore`(+ git index 操作)
**Estimated scope:** XS

> コミット後のユーザー作業: Supabase の該当パスワード / キーのローテーション(spec Open Question 1 の回答に従う)

### Checkpoint: Phase 1
- [ ] 上記 Verification がすべて成功
- [ ] ユーザー承認を得てコミット

---

### Phase 2: 速度(GCal 非ブロック化)

#### Task 2: GCal 取得をクライアント遅延取得に変更

**Description:** `app/page.tsx` の `Promise.all` から `fetchCalendarEvents` を外し、`DashboardClient` で `gcalEnabled && hasProviderToken` のとき `useEffect` から Server Action を呼ぶ。結果は `useRef` の Map(キー: `dateStr`、TTL 5 分)にキャッシュし、`useState` で描画に反映する。`Timeline` への渡し方(`gcalEnabled ? events : []`)は維持。

**Acceptance criteria:**
- [x] `app/page.tsx` が `fetchCalendarEvents` を呼ばない(`hasProviderToken` の算出・受け渡しは維持)
- [x] トグル OFF ではカレンダー取得リクエストが一切発生しない(effect が `gcalEnabled && hasProviderToken` 時のみ実行)
- [x] トグル ON で予定が表示され、同一日付は 5 分以内なら再取得しない(`router.refresh()` 後も再取得なし)
- [x] 日付切替時、キャッシュ未取得の日付のみ取得する

**Verification:**
- [x] `npm run build` 成功
- [x] `npm run lint` 成功(変更ファイルに指摘なし。既存の 2 errors は別ファイル・変更前から存在)
- [ ] 手動: dev サーバーで Network タブを見ながら「初期表示(OFF)→ トグル ON → ブロック移動 → 日付切替」を実施し、Server Action 呼び出しが「ON 直後と新規日付のみ」であること(ユーザー確認待ち)

**Dependencies:** None
**Files likely touched:**
- `app/page.tsx`
- `components/dashboard/DashboardClient.tsx`

**Estimated scope:** S(2 ファイル)

**実装メモ:**
- `calendarEvents` prop は `DashboardClient` から削除(page.tsx からの受け渡しごと)
- effect の依存: `gcalEnabled`, `dateStr`, `hasProviderToken`。unmount 後の setState を避けるため cancelled フラグを使う
- 取得失敗時(空配列が返る)はカレンダー非表示のままで良い(既存の失敗時挙動と同じ)

### Checkpoint: Phase 2
- [ ] `npm run build` / `npm test` / `npm run lint` 成功
- [ ] 手動確認完了(既存機能: ブロック移動・計測・トグルが従来通り動く)

---

### Phase 3: UI(現在時刻ライン + 自動スクロール)

#### Task 3: 現在時刻計算ヘルパーを `lib/time.ts` に追加(TDD)

**Description:** 「現在の JST 時刻がタイムライン起点(06:00)から何分か」を返す純粋関数(例: `getNowTimelineMinutes(now?: Date): number | null`、範囲外は null)を追加する。テストを先に書く。

**Acceptance criteria:**
- [x] JST 06:00 → 0、22:00 以降・06:00 未満 → null、境界値(05:59 / 06:00 / 21:59 / 22:00)が正しい
- [x] `Date` を引数注入できテストが時刻に依存しない

**Verification:**
- [x] `npm test`(新規 `lib/time.test.ts` 7 件を含め全 27 件パス)

**Dependencies:** None
**Files likely touched:**
- `lib/time.ts`
- `lib/time.test.ts`(新規)

**Estimated scope:** XS-S

#### Task 4: Timeline に現在時刻ライン + 自動スクロールを実装

**Description:** `Timeline.tsx` に赤い現在時刻ラインを追加(今日表示時のみ、1 分毎更新、`pointer-events-none`、マウント後にのみ描画)。初期マウント時(および今日への日付切替時)に、スクロールコンテナ(`overflow-y-auto` の div)をラインが上から 1/3 の位置に来るようスクロールする。

**Acceptance criteria:**
- [x] 今日を表示中、現在時刻の位置(`分 × PX_PER_MINUTE`)に赤ライン + 左端ドットが表示される
- [x] 過去・未来の日付、および 06:00–22:00 範囲外の時刻では非表示(`isTodayView` ガード + `getNowTimelineMinutes` が範囲外で null)
- [x] 1 分経過でラインが移動する(`setInterval` 60s、unmount で clear)
- [x] 今日の初期表示で現在時刻付近(上から約 1/3)へ自動スクロールされる

**Verification:**
- [x] `npm run build` / `npm run lint` 成功
- [ ] 手動: 今日表示・別日表示・日付を今日へ戻す、の 3 パターンで表示とスクロールを確認。既存の DnD・リサイズがライン上でも動作すること(pointer-events-none)(ユーザー確認待ち)

**Dependencies:** Task 3
**Files likely touched:**
- `components/timeline/Timeline.tsx`

**Estimated scope:** S(1 ファイル)

**実装メモ:**
- スクロールコンテナは `Timeline.tsx:198` 付近の `overflow-y-auto` div。ref を追加し `scrollTop = topPx - containerHeight / 3` 相当を設定
- 色はテーマトークンと調和する赤系(既存 CSS 変数に赤系がなければ `#ef4444` 等を直接指定し、ダークテーマでも視認できることを確認)

### Checkpoint: Complete
- [ ] `npm run build` / `npm test` / `npm run lint` すべて成功
- [ ] spec の Success Criteria 4 項目をすべて満たす
- [ ] ユーザーレビュー → 承認後にコミット(タスク単位 or フェーズ単位、ユーザー指示に従う)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 現在時刻ラインの hydration mismatch | Med | マウント後にのみ描画(初期 null) |
| GCal 遅延取得で `calendarEvents` prop 削除が他コンポーネントに波及 | Low | 事前 grep で参照箇所を確認済み(`DashboardClient` → `Timeline` のみ)。ビルドで型チェック |
| Server Action をクライアントから直接呼ぶ際の認証 | Low | `fetchCalendarEvents` 内で `getUser()` 検証済み(既存実装のまま) |
| 自動スクロールが既存のスクロール操作と競合 | Low | 初回マウント時のみ実行(`behavior: "auto"`)。日付切替時は「今日に戻ったとき」のみ |
| supabasepass.md ローテーション漏れ | High | Task 1 完了時にユーザーへ明示的にリマインド |

## Parallelization

3 フェーズは互いに独立(Task 3→4 のみ順序依存)。ただし単一セッションで順次実施する想定。

## Open Questions

- spec の Open Questions(ローテーションのタイミング / スクロール位置 1/3 / TTL 5 分)は未回答。デフォルト案で進め、実装中に変更があれば反映する。
