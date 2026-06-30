# SPEC: Issue #16 — Googleカレンダー連携機能

## 1. 目的

Googleカレンダーのイベントをタイムライン上に表示し、スケジュールの全体像を把握できるようにする。

**対象ユーザー:** Google OAuthでログインしているユーザー

---

## 2. スコープ

### In scope
- Googleカレンダーの当日イベントをタイムラインに読み取り専用ブロックとして表示
- Google OAuthスコープに `calendar.readonly` を追加（初回連携フロー）
- カレンダー連携の有効・無効をユーザーが切り替えられる設定

### Out of scope
- カレンダーへの書き込み（イベント作成・更新・削除）
- 複数カレンダーの選択UI（初期実装は「プライマリカレンダー」のみ）
- カレンダーイベントからTodoへの変換

---

## 3. 機能仕様

### 3-1. OAuthスコープの追加

現在の `signInWithOAuth` に `calendar.readonly` スコープを追加する。

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: "https://www.googleapis.com/auth/calendar.readonly",
  },
});
```

Supabaseはプロバイダアクセストークンを `provider_token` としてセッションに保持する。既存ユーザーが `calendar.readonly` スコープなしでログイン済みの場合、再ログインが必要になる。

### 3-2. カレンダーイベント取得（Server Action）

`app/actions/google-calendar.ts` を新規作成。

```ts
// 取得対象: Google Calendar API v3 "events.list"
// エンドポイント: https://www.googleapis.com/calendar/v3/calendars/primary/events
// パラメータ:
//   timeMin: 当日の TIMELINE_START_HOUR (例: 06:00) ISO8601
//   timeMax: 当日の TIMELINE_END_HOUR   (例: 24:00) ISO8601
//   singleEvents: true
//   orderBy: startTime
```

**戻り値の型 (`CalendarEvent`):**

```ts
type CalendarEvent = {
  id: string;
  title: string;
  startMinutes: number;   // タイムライン上の分オフセット (TIMELINE_START_HOUR 基準)
  durationMinutes: number;
  isAllDay: boolean;
};
```

- `provider_token` はSupabaseセッションから `supabase.auth.getSession()` で取得
- トークン取得失敗時は空配列を返す（タイムラインを壊さない）
- 終日イベント (`isAllDay: true`) はタイムラインに表示しない（バッジ等は別途検討）

### 3-3. タイムラインへの表示

`components/timeline/Timeline.tsx` に `calendarEvents?: CalendarEvent[]` propsを追加。

カレンダーイベントブロックの仕様:
- 色: 薄い青（`bg-blue-100 border-blue-300`）で既存のTodoブロックと区別
- ラベル: イベントタイトル（長い場合は truncate）
- インタラクション: ホバーでツールチップ表示のみ（クリック不可、DnD不可）
- 重なり処理: 既存の `getOverlappingIds` ロジックとは分離し、カレンダーブロック専用レーンに表示

### 3-4. データフロー

```
Dashboard (page.tsx or dashboard component)
  ├─ fetchCalendarEvents(date) [Server Action]
  └─ <Timeline calendarEvents={events} ... />
```

カレンダーイベントはページ初回レンダリング時に取得し、日付変更時に再取得する。

### 3-5. 連携設定UI

- ダッシュボードに「Googleカレンダーを表示」トグルを追加（`localStorage` で状態保持）
- トグルOFFの場合、`fetchCalendarEvents` を呼ばない
- `provider_token` がない（メール/パスワードログイン）ユーザーにはトグルを非表示

---

## 4. データベース変更

**なし。** カレンダーイベントはGoogleから都度取得し、DBには保存しない。

---

## 5. ファイル構成

```
app/
  actions/
    google-calendar.ts     # 新規: fetchCalendarEvents Server Action
components/
  timeline/
    Timeline.tsx           # 変更: calendarEvents props追加
    CalendarEventBlock.tsx # 新規: カレンダーイベント表示コンポーネント
  dashboard/
    GoogleCalendarToggle.tsx  # 新規: 連携ON/OFFトグル
lib/
  types.ts                 # 変更: CalendarEvent 型を追加
```

---

## 6. 受け入れ条件

| # | 条件 |
|---|------|
| 1 | Google OAuthでログインし、カレンダースコープを許可すると、当日のGoogleカレンダーイベントがタイムラインに表示される |
| 2 | カレンダーイベントブロックはTodoブロックと視覚的に区別できる（色が異なる） |
| 3 | カレンダーイベントはドラッグ不可・編集不可（読み取り専用） |
| 4 | 「Googleカレンダーを表示」トグルをOFFにすると、カレンダーブロックが消える |
| 5 | メール/パスワードログインユーザーにはカレンダートグルが表示されない |
| 6 | `provider_token` 取得失敗・API エラー時はタイムラインが壊れず、静かに失敗する |
| 7 | 終日イベントはタイムライン上に表示しない |

---

## 7. 技術的注意事項

- **`provider_token` の有効期限:** Supabaseはアクセストークンをセッション中に保持するが、有効期限（1時間）後は `provider_refresh_token` での再取得が必要。初期実装では期限切れ時に空配列を返し、再ログインを促すトースト通知を表示する。
- **Google Calendar API の有効化:** Google Cloud Console で Calendar API を有効化し、OAuth同意画面に `calendar.readonly` スコープを追加する必要がある（`doc/setup.md` に手順を追記）。
- **レート制限:** Google Calendar API の無料枠は十分（1,000,000リクエスト/日）だが、不要なリクエストを避けるため日付変更時のみ再フェッチする。
