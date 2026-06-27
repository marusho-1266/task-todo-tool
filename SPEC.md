# Spec: Issue-11 計測開始ボタンのカーソル対応

## Objective

計測開始ボタンにマウスを合わせた際、カーソルが通常のままであるため、ユーザーが「クリック可能」なボタンだと認識しづらい。ボタンホバー時のカーソルをポインター（pointer）に変更することで、UI/UXを改善する。

**対象ユーザー：** task-todo-tool を使用する全ユーザー  
**成功の定義：** 計測開始ボタン（▶）にホバー時、カーソルが自動的にポインターに変わること

## Tech Stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS (styling)
- @hello-pangea/dnd (drag & drop)

## Commands

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |

## Project Structure

```
components/
├── timeline/
│   └── Timeline.tsx          ← 計測開始ボタンを含む主要コンポーネント
└── timeline/
    └── QuickAddModal.tsx     ← 割込計測の計測開始ボタン
```

## Code Style

計測開始ボタンは現在、以下のように `cursor` クラスが**未指定**です：

```tsx
// ❌ 現在（cursor 指定なし）
<button
  className="rounded px-1 py-0.5 text-xs font-medium"
  style={{ background: "var(--color-plan)" }}
>
  ▶
</button>

// ✅ 修正後（cursor-pointer を追加）
<button
  className="rounded px-1 py-0.5 text-xs font-medium cursor-pointer"
  style={{ background: "var(--color-plan)" }}
>
  ▶
</button>
```

Tailwind CSS の `cursor-pointer` クラスを className に追加してください。

## Testing Strategy

### Unit Tests
- ボタンが存在することを確認
- className に `cursor-pointer` が含まれることを確認

### Manual Testing
1. タイムラインの計画ブロック上の計測開始ボタン（▶）にマウスを合わせた時、カーソルがポインターに変わることを確認
2. 短いブロック（高さが小さい計画）と通常サイズのブロックの両方で確認
3. モーダル内の「割込計測」ボタンにマウスを合わせた時、カーソルがポインターに変わることを確認

## Boundaries

- **Always do:**
  - ボタンホバー時のカーソルを「pointer」に統一する
  - 機能的な動作は変更しない
  - 他のボタンへの影響を最小化する

- **Ask first:**
  - 他のボタンの cursor スタイルを一括変更する場合
  - hover エフェクト（スケール変更など）を追加する場合

- **Never do:**
  - 機能を変更する
  - デザイントークン（色、フォント）を変更する
  - テスト不要なボタンを作成する

## Success Criteria

1. ✅ `components/timeline/Timeline.tsx` の 2 つの計測開始ボタンに `cursor-pointer` クラスが追加される
2. ✅ `components/timeline/QuickAddModal.tsx` の計測開始ボタンに `cursor-pointer` クラスが追加される
3. ✅ 開発環境で視覚的に確認：ホバー時にカーソルがポインターに変わる
4. ✅ ESLint エラーなし、ビルド成功

## Open Questions

なし（要件は明確）
