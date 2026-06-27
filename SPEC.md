# Spec: Issue-13 明日を準備 — 繰越先日付の選択

## Objective

「明日を準備」は翌日（+1日）固定でTodoを繰越す。翌日が休みのときや任意の未来日に繰越したい場合に対応できない。

**改善点:** モーダル内に日付セレクタを追加し、ユーザーが繰越先日付を自由に選べるようにする。

**対象ユーザー:** task-todo-tool を使用する全ユーザー  
**成功の定義:** 「明日を準備」で任意の未来日に繰越しを実行できる

## Tech Stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS (styling)
- Supabase (Postgres + Auth + RLS)

## Commands

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm test` | ユニットテスト（vitest） |

## Project Structure

変更対象は以下の2ファイルのみ:

```
components/
└── prepare-tomorrow/
    └── PrepareTomorrowModal.tsx   ← 日付セレクタを追加

app/actions/
└── prepare-tomorrow.ts            ← targetDateStr 引数を受け取るよう変更
```

`lib/prepare-tomorrow.ts` の `addDaysToDateStr` はそのまま流用。新規ヘルパー追加なし。

## 仕様詳細

### UI の変更（PrepareTomorrowModal）

ヘッダーの「○月○日のカレンダーに反映します」の部分を日付セレクタに変更する。

```
明日を準備

反映先: [日付入力欄  YYYY-MM-DD  ▼]
```

- `<input type="date">` で実装
- **初期値:** 翌日（`addDaysToDateStr(todayDateStr, 1)`）—— 現行と同じ
- **最小値 (`min`):** `addDaysToDateStr(todayDateStr, 1)`（今日以前は選択不可）
- **最大値 (`max`):** 制限なし
- ユーザーが選択した日付を `targetDateStr` として state 管理

### ロジックの変更（Server Action）

`prepareTomorrow` の引数に `targetDateStr` を追加し、内部で固定していた `addDaysToDateStr(todayDateStr, 1)` を置き換える。

```ts
// 変更前
export async function prepareTomorrow(
  todayDateStr: string,
  selectedTaskIds: string[],
  utcOffsetMinutes: number,
)

// 変更後
export async function prepareTomorrow(
  todayDateStr: string,
  selectedTaskIds: string[],
  utcOffsetMinutes: number,
  targetDateStr: string,   // ← 追加
)
```

- `targetDateStr <= todayDateStr` の場合はエラーを返す（ガード）
- トースト・遷移先の日付表示も `targetDateStr` を使う

## Code Style

### PrepareTomorrowModal（変更点）

```tsx
const defaultTarget = addDaysToDateStr(todayDateStr, 1);
const [targetDateStr, setTargetDateStr] = useState(defaultTarget);

// ヘッダー部分
<input
  type="date"
  min={defaultTarget}
  value={targetDateStr}
  onChange={(e) => setTargetDateStr(e.target.value)}
/>
```

`handleSubmit` 内の `prepareTomorrow` 呼び出しに `targetDateStr` を追加する。

## Testing Strategy

### Unit Tests

既存の `lib/prepare-tomorrow.test.ts` への追加はなし（純粋関数の変更がないため）。

### Manual Testing

1. 「明日を準備」を開くと初期値が翌日になっていること
2. 日付を3日後に変更して「反映」→ 3日後のカレンダーへ遷移し、Todoが作成されること
3. 今日以前の日付は選択不可（`min` 制約）であること
4. 繰越後のトーストに選択した日付が表示されること

## Boundaries

- **Always do:**
  - 初期値は翌日（既存の動作を維持）
  - 今日以前の日付は選択不可

- **Ask first:**
  - 土日・祝日の自動検出・警告を追加する場合（別 Issue で対応）
  - カレンダーUIに切り替える場合

- **Never do:**
  - 特定の日付（土日等）を選択不可にする（ユーザーの選択権を奪わない）
  - 既存の `addDaysToDateStr` のロジックを変更する

## Success Criteria

1. ✅ `PrepareTomorrowModal` に日付セレクタが追加される
2. ✅ 初期値は翌日（既存動作を維持）
3. ✅ 今日以前は選択不可
4. ✅ 選択した任意の未来日に繰越しが実行される
5. ✅ 遷移先・トーストが選択した日付を使う
6. ✅ ESLint エラーなし、`npm run build` 成功

## Open Questions

- 土日・祝日の自動検出はスコープ外（別 Issue で検討）
