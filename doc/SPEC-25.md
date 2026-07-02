# Spec: issue #25 Googleカレンダー連携の表示・計測改善

## Objective
Googleカレンダーから連携された予定ブロックが計画・実績の両レーンにまたがって表示され、時刻ラベルも隠してしまっている。計画レーンだけに収まるよう修正し、あわせてカレンダー予定から実績計測を開始できるボタンを追加する。

## 現状の問題
1. `components/timeline/CalendarEventBlock.tsx` が `left-0 right-0`（タイムライン全幅）でブロックを配置しているため、
   - 左端の時刻ラベル列（`w-12`）を覆ってしまう
   - 計画（左半分）・実績（右半分）の両レーンにまたがって表示される
2. カレンダー予定は読み取り専用ブロックで、そこから実績計測を始める手段がない。

## 変更方針

### 1. 表示位置の修正
- `CalendarEventBlock` のクラスを `lib/timeline-blocks.ts` の `PLAN_LANE_CLASS`（`absolute left-12 right-[46%]`）に変更し、計画レーンのみに収める。
- 既存の `pointer-events-none` は計測ボタンを押せるようにするため、ブロック自体からは外し、内部要素で制御する。

### 2. 計測ボタンの追加
- `CalendarEventBlock` に ▶ ボタンを追加。押すと `startAdHocSession(event.title, date)`（`app/actions/sessions.ts`）を呼び出し、タスクを作らず即座に実績計測を開始する（`QuickAddModal` と同じ仕組みを流用）。
- 計測を開始するには `date`（対象日, `YYYY-MM-DD`）が必要なため、`CalendarEventBlock` の props に `date: string` を追加。呼び出し元 `Timeline.tsx` から渡す。
- 計測開始後は `onUpdated` 相当のコールバックで一覧を再取得する必要があるため、`onStarted: () => void` を props に追加（Timeline側で `onUpdated` を渡す）。
- 既に計測中のセッションがある場合は `startAdHocSession` がエラーを返すので、`useToast` でエラーメッセージを表示する。

## Tech Stack
- Next.js (App Router) / React / TypeScript
- Tailwind CSS（インラインstyleとCSS変数併用）
- Supabase（サーバーアクション経由）

## 対象ファイル
- `components/timeline/CalendarEventBlock.tsx`（修正）
- `components/timeline/Timeline.tsx`（`CalendarEventBlock` への props 追加）

## Testing Strategy
- 既存に自動テストなし（手動確認）。
- 確認項目:
  - カレンダー予定ブロックが計画レーン内に収まり、時刻ラベルが見えること
  - ▶ボタン押下で実績計測（work_sessions）が開始され、割り込みタスクとしてTodoが作成されること
  - 計測中に別の予定やTodoで計測を開始しようとするとエラートーストが出ること

## Boundaries
- Always: 既存の `startAdHocSession` の挙動（割り込みバケットタスクへの記録）をそのまま利用する
- Ask first: DBスキーマ変更、依存追加
- Never: カレンダー予定自体をDBに書き込む・編集可能にする（読み取り専用の性質は維持）

## Success Criteria
- カレンダー予定ブロックが計画レーンのみに表示され、時刻ラベルを隠さない
- カレンダー予定ブロックから計測を開始でき、実績として記録される

## Open Questions
なし（ユーザー承認済み方針）
