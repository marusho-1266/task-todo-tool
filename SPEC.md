# Spec: Issue-14 計画の日付修正時にタイムラインが最下部へスクロールするバグ

## Objective

計画ブロックを左クリックして日付を変更した際、タイムラインが画面最下部へスクロールしてしまう。

**原因:**  
`updateTodoSchedule` Server Action が `scheduled_start` と `planned_minutes` しか DB 更新しておらず、`todos.date` カラムが更新されない。例として今日(2026-06-27)の Todo の `scheduled_start` を明日(2026-06-28)に変えると、DB 上の `date` は "2026-06-27" のままで `scheduled_start` だけ翌日になる。  
リフレッシュ後、今日の画面で対象 Todo を取得し `minutesFromDayStart("2026-06-28T09:00:00", "2026-06-27")` が 1 日分以上の分数（≒1620分）を返す → `topPx = 1944px` でタイムライン高さ(≒1152px)をはるかに超えた位置にブロックが配置 → 画面が最下部へスクロール。

**対象ユーザー:** task-todo-tool を使用する全ユーザー  
**成功の定義:** 計画の日付を変更した後、タイムラインが意図しない位置にスクロールしない。変更された Todo は新しい日付の画面に表示される（今日の画面からは消える）。

## Tech Stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS (styling)
- Supabase (Postgres + RLS)
- @hello-pangea/dnd (drag & drop)

## Commands

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |

## Project Structure

```
app/actions/
└── todos.ts                        ← updateTodoSchedule（修正対象）

components/sessions/
└── EditTodoScheduleModal.tsx       ← 日付修正モーダル（参照のみ）

lib/
└── time.ts                         ← minutesFromDayStart（挙動の理解のみ）
```

## Code Style

`updateTodoSchedule` の DB 更新部分に `date: date` を追加する：

```typescript
// ❌ 現在（date カラムが更新されない）
const { error } = await supabase
  .from("todos")
  .update({
    scheduled_start: scheduledStart,
    planned_minutes: clampedMinutes,
  })
  .eq("id", todoId)
  .eq("user_id", user.id);

// ✅ 修正後（date カラムも更新する）
const { error } = await supabase
  .from("todos")
  .update({
    date: date,
    scheduled_start: scheduledStart,
    planned_minutes: clampedMinutes,
  })
  .eq("id", todoId)
  .eq("user_id", user.id);
```

## Testing Strategy

### Manual Testing
1. 開発サーバーを起動し、今日の日付でログイン
2. タイムラインに配置された計画ブロックを左クリック → 「計画を修正」モーダルが開く
3. 開始日時を翌日に変更して「保存」をクリック
4. 期待結果：
   - タイムラインが最下部にスクロール**しない**
   - 今日の画面から該当 Todo が消える
   - 翌日の画面に切り替えると該当 Todo が表示される
5. 同じ日付で時刻のみ変更した場合も動作確認（スクロール不具合なし）

### Unit Tests
- 既存の overlap テストが壊れていないことを確認

## Boundaries

- **Always do:**
  - `date` カラムも `scheduled_start` に合わせて更新する
  - 既存の重なり検知ロジックを維持する

- **Ask first:**
  - 日付変更後にユーザーを新しい日付の画面へ自動遷移させるか

- **Never do:**
  - 機能的な動作（重なり禁止・スナップ等）を変更する
  - デザインを変更する

## Success Criteria

1. ✅ `app/actions/todos.ts` の `updateTodoSchedule` が `date` カラムを更新する
2. ✅ 計画の日付を変更してもタイムラインが最下部へスクロールしない
3. ✅ 変更後、今日の画面から Todo が消え、新しい日付に表示される
4. ✅ ESLint エラーなし、ビルド成功

## Open Questions

なし（日付変更後はユーザーを現在の画面に留める仕様に決定）
