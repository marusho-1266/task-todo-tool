"use client";

export function BacklogStub() {
  return (
    <details
      className="border-t"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <summary
        className="cursor-pointer px-4 py-3 text-sm font-medium select-none"
        style={{
          color: "var(--color-ink-muted)",
          fontFamily: "var(--font-body)",
        }}
      >
        ▼ バックログ / Inbox（P2 で実装）
      </summary>
      <p
        className="px-4 pb-4 text-sm"
        style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
      >
        バックログからの DnD 配置は P2 で追加予定です。
      </p>
    </details>
  );
}
