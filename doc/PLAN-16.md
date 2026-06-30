# 実装計画: Issue #16 — Googleカレンダー連携機能

## 概要

Googleカレンダーの当日イベントをタイムラインに読み取り専用ブロックとして表示する。
既存のGoogle OAuthログインに `calendar.readonly` スコープを追加し、Server Actionでイベントを取得、Timelineコンポーネントに渡す。DBへの変更はなし。

## アーキテクチャ決定事項

- **トークン取得:** `supabase.auth.getSession()` の `provider_token` を使用（サーバーサイドのみ）
- **データフロー:** `app/page.tsx`（Server Component）で取得 → `DashboardClient` → `Timeline` にprops経由で渡す
- **状態保持:** トグルのON/OFFは `localStorage`（Clientサイド）
- **エラー方針:** API失敗は空配列を返し、タイムラインは壊れない

---

## Task List

### Phase 1: 型定義 + OAuthスコープ追加

---

#### Task 1: `CalendarEvent` 型を追加し、OAuthスコープを拡張する

**Description:** `lib/types.ts` に `CalendarEvent` 型を追加する。合わせて `app/login/page.tsx` の `signInWithOAuth` に `calendar.readonly` スコープを追加する。

**Acceptance criteria:**
- [ ] `lib/types.ts` に `CalendarEvent` 型が定義されている
- [ ] `app/login/page.tsx` の `handleGoogleLogin` に `scopes` オプションが追加されている
- [ ] TypeScriptコンパイルエラーなし

**Verification:**
- [ ] `npm run build` が通る

**Dependencies:** なし

**Files likely touched:**
- `lib/types.ts`
- `app/login/page.tsx`

**Estimated scope:** XS

---

### Phase 2: Server Action（イベント取得）

---

#### Task 2: `fetchCalendarEvents` Server Actionを実装する

**Description:** `app/actions/google-calendar.ts` を新規作成し、Google Calendar API v3からプライマリカレンダーの当日イベントを取得する。`provider_token` がない・期限切れ・APIエラーの場合は空配列を返す。

**Acceptance criteria:**
- [ ] `provider_token` を `supabase.auth.getSession()` から取得している
- [ ] `timeMin` / `timeMax` に `TIMELINE_START_HOUR` / `TIMELINE_END_HOUR` を使用している
- [ ] 終日イベント（`event.start.date` が存在する）は `isAllDay: true` でフィルタされる
- [ ] `provider_token` が `null` の場合は `[]` を返す
- [ ] API呼び出し失敗時は `[]` を返す（throwしない）
- [ ] `startMinutes` は `TIMELINE_START_HOUR` 基準の分オフセット

**Verification:**
- [ ] `npm run build` が通る（型エラーなし）

**Dependencies:** Task 1

**Files likely touched:**
- `app/actions/google-calendar.ts`（新規）
- `lib/time.ts`（`TIMELINE_START_HOUR` の再利用確認のみ）

**Estimated scope:** S

---

### Checkpoint: Phase 1–2 完了
- [ ] `npm run build` が通る
- [ ] `lib/types.ts` に `CalendarEvent` 型がある
- [ ] `app/actions/google-calendar.ts` が存在する

---

### Phase 3: UIコンポーネント

---

#### Task 3: `CalendarEventBlock` コンポーネントを実装する

**Description:** `components/timeline/CalendarEventBlock.tsx` を新規作成。`CalendarEvent` を受け取り、タイムライン上の絶対位置に青色の読み取り専用ブロックを表示する。位置計算は既存の `PX_PER_MINUTE` を使用する。

**Acceptance criteria:**
- [ ] `bg-blue-100 border border-blue-300` など、Todoブロックと視覚的に区別できる色が使われている
- [ ] タイトルが `truncate` で表示される
- [ ] ホバー時にツールチップ（タイトル + 時刻）が表示される
- [ ] クリック・DnD操作を受け付けない（`pointer-events-none` または onClick未定義）
- [ ] 高さ・上端位置は `startMinutes * PX_PER_MINUTE` / `durationMinutes * PX_PER_MINUTE` で計算される

**Verification:**
- [ ] `npm run build` が通る

**Dependencies:** Task 1

**Files likely touched:**
- `components/timeline/CalendarEventBlock.tsx`（新規）

**Estimated scope:** S

---

#### Task 4: `GoogleCalendarToggle` コンポーネントを実装する

**Description:** `components/dashboard/GoogleCalendarToggle.tsx` を新規作成。`localStorage` の `gcal-enabled` キーでON/OFFを保持するトグルUI。`hasProviderToken: boolean` propsを受け取り、`false` の場合は `null` を返す（非表示）。

**Acceptance criteria:**
- [ ] `provider_token` がない場合（`hasProviderToken: false`）はコンポーネントが何もレンダリングしない
- [ ] `localStorage` の `gcal-enabled` で状態を永続化する
- [ ] SSRハイドレーションエラーが出ない（`useEffect` で初期値を読む）
- [ ] ON/OFFのコールバック `onChange(enabled: boolean)` を呼ぶ

**Verification:**
- [ ] `npm run build` が通る

**Dependencies:** なし（型依存なし）

**Files likely touched:**
- `components/dashboard/GoogleCalendarToggle.tsx`（新規）

**Estimated scope:** S

---

### Phase 4: 統合

---

#### Task 5: `app/page.tsx` でカレンダーイベントを取得し、`DashboardClient` に渡す

**Description:** `app/page.tsx`（Server Component）で `fetchCalendarEvents(dateStr)` を既存クエリと並列実行する。セッションの `provider_token` の有無を検出し、`hasProviderToken` フラグと `calendarEvents` を `DashboardClient` に追加propsとして渡す。

**Acceptance criteria:**
- [ ] `fetchCalendarEvents` が既存の `Promise.all` に並列で追加されている
- [ ] `calendarEvents: CalendarEvent[]` が `DashboardClient` に渡される
- [ ] `hasProviderToken: boolean` が `DashboardClient` に渡される
- [ ] カレンダーAPIが失敗してもページがクラッシュしない（空配列フォールバック）

**Verification:**
- [ ] `npm run build` が通る

**Dependencies:** Task 2

**Files likely touched:**
- `app/page.tsx`
- `components/dashboard/DashboardClient.tsx`

**Estimated scope:** M

---

#### Task 6: `DashboardClient` にトグルと `Timeline` への接続を追加する

**Description:** `DashboardClient.tsx` に `GoogleCalendarToggle` を組み込み、トグルのON/OFF状態に応じて `calendarEvents` を `Timeline` に渡すかどうかを制御する。

**Acceptance criteria:**
- [ ] `GoogleCalendarToggle` が `DashboardClient` 内に配置されている
- [ ] トグルON時: `calendarEvents` が `Timeline` に渡される
- [ ] トグルOFF時: `Timeline` に空配列または `undefined` が渡される
- [ ] `hasProviderToken: false` のユーザーにはトグルが表示されない

**Verification:**
- [ ] `npm run build` が通る

**Dependencies:** Task 4, Task 5

**Files likely touched:**
- `components/dashboard/DashboardClient.tsx`

**Estimated scope:** S

---

#### Task 7: `Timeline.tsx` にカレンダーイベントブロックを描画する

**Description:** `Timeline.tsx` に `calendarEvents?: CalendarEvent[]` propsを追加し、`CalendarEventBlock` を使って終日イベントを除外した各イベントをタイムライン上に重ならないよう専用レーンで描画する。

**Acceptance criteria:**
- [ ] `calendarEvents` propsが `Timeline` に追加されている（オプショナル）
- [ ] `isAllDay: true` のイベントはレンダリングしない
- [ ] カレンダーブロックはTodoブロックと重ならない（専用の右レーンで表示）
- [ ] カレンダーブロックはDnD対象にならない（`Droppable` の外側に配置）
- [ ] `calendarEvents` が `undefined` / 空のとき既存の表示が変わらない

**Verification:**
- [ ] `npm run build` が通る
- [ ] 手動確認: Googleカレンダーイベントがタイムラインに青色ブロックで表示される

**Dependencies:** Task 3, Task 6

**Files likely touched:**
- `components/timeline/Timeline.tsx`

**Estimated scope:** M

---

### Checkpoint: 全タスク完了
- [ ] `npm run build` がエラーなし
- [ ] Google OAuthログイン → カレンダーイベントがタイムラインに表示される
- [ ] トグルOFF → ブロックが消える
- [ ] メール/PWログインユーザー → トグルが非表示
- [ ] API失敗時 → タイムラインは正常表示
- [ ] 終日イベント → タイムラインに表示されない

---

## タスク依存関係図

```
Task 1 (型定義・スコープ)
  ├─ Task 2 (Server Action)
  │     └─ Task 5 (page.tsx 統合)
  │           └─ Task 6 (DashboardClient)
  │                 └─ Task 7 (Timeline描画)
  └─ Task 3 (CalendarEventBlock)
        └─ Task 7 (Timeline描画)

Task 4 (Toggle)
  └─ Task 6 (DashboardClient)
```

**推奨実装順:** 1 → 2 → 3 → 4 → 5 → 6 → 7

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 既存ユーザーがスコープなしトークンを持っている | 高 | `provider_token` チェック→空配列。再ログインを促すトーストは不要（トグル表示で判断） |
| `provider_token` のSSR/クライアント取得ミス | 高 | Server Actionのみでトークン取得（クライアントには渡さない） |
| カレンダーブロックがDnDに干渉する | 中 | `Droppable` の外に絶対配置でレンダリング |
| Google Calendar APIがCORSエラー | 低 | Server Actionから呼ぶため問題なし |
