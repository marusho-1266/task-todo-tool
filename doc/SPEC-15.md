# Spec: Issue-15 全体的な速度改善

## Objective

**現象:** システム全体的に速度が遅い、特に DnD（ドラッグ&ドロップ）などのユーザー操作レスポンスが低速。

**原因仮説:**
- Vercel / Supabase 無料アカウントのリソース制限
- フロントエンドの不必要な再レンダリング
- バックエンド API の重い計算処理
- データベースクエリの非効率性

**対象ユーザー:** task-todo-tool を使用する全ユーザー

**成功の定義:** 
- DnD 操作時のレスポンス遅延を改善
- 無料プラン（Vercel + Supabase）の制限内での最適化
- 体感速度が現在比 2〜3 倍程度改善される

## Tech Stack

- Next.js (App Router) + TypeScript + React 19
- Tailwind CSS (styling)
- Supabase (Postgres + RLS)
- @hello-pangea/dnd (drag & drop)
- Vercel (Deployment)

## Commands

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド（バンドルサイズ確認用） |
| `npm run lint` | ESLint |
| `npm test` | ユニットテスト実行 |

**パフォーマンス測定コマンド:**
```bash
# Chrome DevTools で Lighthouse 実行
# または Network タブで API 応答時間を計測
```

## Project Structure

```
app/
├── actions/              ← Server Actions（API 最適化の対象）
│   ├── todos.ts         ← Todo 操作（DnD 関連）
│   └── sessions.ts      ← セッション管理
├── api/                 ← Edge Functions（Supabase RPC 代替検討）
└── ...

components/
├── calendar/            ← タイムラインコンポーネント（再レンダリング最適化対象）
│   └── TimelineView.tsx
├── sessions/
│   └── EditTodoScheduleModal.tsx
└── ...

lib/
├── time.ts             ← 時間計算（キャッシュ検討）
├── db/
│   └── todos.ts        ← DB アクセスパターン（N+1 問題対象）
└── ...

supabase/
└── migrations/         ← クエリ最適化用のインデックス追加候補
```

## Code Style

**最適化のポイント:**

### 1. React の再レンダリング最適化
```typescript
// ❌ 非効率（毎回全 todos を再レンダリング）
function TimelineView({ todos }) {
  return todos.map(todo => <TodoBlock key={todo.id} {...todo} />);
}

// ✅ 最適化（useMemo で依存関係を限定）
const memoizedTodos = useMemo(
  () => todos.map(todo => <TodoBlock key={todo.id} {...todo} />),
  [todos]
);
```

### 2. Server Action の最適化
```typescript
// ❌ 非効率（毎回全 todo リストを取得してリフレッシュ）
export async function updateTodoSchedule(todoId, schedule) {
  await supabase.from("todos").update(schedule).eq("id", todoId);
  // その後、ページ全体をリフレッシュ
}

// ✅ 最適化（部分更新のみ返却）
export async function updateTodoSchedule(todoId, schedule) {
  const { data, error } = await supabase
    .from("todos")
    .update(schedule)
    .eq("id", todoId)
    .select(); // 更新結果のみ返す
  return data[0];
}
```

### 3. Supabase クエリ最適化
```typescript
// ❌ N+1 問題（todo ごとに sessions テーブル検索）
const todos = await supabase.from("todos").select("*");
for (const todo of todos) {
  const sessions = await supabase
    .from("work_sessions")
    .select("*")
    .eq("task_id", todo.task_id);
}

// ✅ 最適化（JOIN + 1回で取得）
const todos = await supabase
  .from("todos")
  .select("*, task:tasks(*, sessions:work_sessions(*))");
```

## Testing Strategy

### Manual Performance Testing

1. **DnD レスポンス計測**
   - Chrome DevTools の Network タブで API 応答時間を記録
   - タイムラインで Todo をドラッグして操作時間を計測
   - 目安: 200ms 以内に UI 応答

2. **ページロード測定**
   - Lighthouse で初期ロード速度を計測
   - 目安: LCP < 2.5s（可能な範囲で）

3. **バンドルサイズ確認**
   ```bash
   npm run build
   # `.next/static/` のサイズを確認
   ```

### Unit Tests
- 既存テストが壊れていないことを確認
- 必要に応じて DB クエリのユニットテストを追加

### ブラウザ DevTools
- Network タブで API リクエストの時間を追跡
- Performance タブで React re-render を確認

## Boundaries

- **Always do:**
  - 無料プラン（Vercel/Supabase）の制限内で最適化
  - パフォーマンス改善前後で機能動作が変わらないことを確認
  - 変更内容を記録してドキュメント更新

- **Ask first:**
  - バックエンド API の大幅な構造変更
  - キャッシング戦略の導入（Redis など）
  - Supabase の有料プラン への移行検討

- **Never do:**
  - 機能的な挙動を変更する
  - デザイン・UI を変更する
  - RLS ルールを緩和する

## Success Criteria

1. ✅ DnD 操作時の API レスポンス時間が 200ms 以内
2. ✅ ページロード時の LCP が改善（現在値測定後に目標値を決定）
3. ✅ 無料プランの制約内で動作（追加の有料プラン契約なし）
4. ✅ 全機能が従来通り動作（リグレッション なし）
5. ✅ ESLint エラーなし、ビルド成功

## Open Questions

1. **測定基準:** 現在のページロード時間・API レスポンス時間の具体値は？
   - 計測データがあれば改善目標を明確に設定可能

2. **優先順位:** 以下のどれを優先すべきか
   - DnD レスポンス（ユーザー体感）
   - 初期ロード速度（第一印象）
   - 全体的なバランス改善

3. **有料プラン検討:** 無料プラン内での限界値に達した場合、有料への移行は検討対象か？
