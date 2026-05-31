"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateParam, isToday } from "@/lib/time";

type Props = {
  selectedDate: Date;
};

export function DateNav({ selectedDate }: Props) {
  const router = useRouter();
  const dateStr = formatDateParam(selectedDate);

  function shiftDays(delta: number) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    router.push(`/?date=${formatDateParam(next)}`);
  }

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="日付ナビゲーション"
    >
      <button
        type="button"
        onClick={() => shiftDays(-1)}
        className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-sm transition-colors hover:bg-[var(--color-paper-2)]"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-body)",
        }}
      >
        ← 前日
      </button>
      {!isToday(selectedDate) && (
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-sm transition-colors hover:bg-[var(--color-paper-2)]"
          style={{
            borderColor: "var(--color-rule)",
            color: "var(--color-accent)",
            fontFamily: "var(--font-body)",
          }}
        >
          今日
        </Link>
      )}
      <button
        type="button"
        onClick={() => shiftDays(1)}
        className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-sm transition-colors hover:bg-[var(--color-paper-2)]"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-body)",
        }}
      >
        翌日 →
      </button>
      <input
        type="date"
        value={dateStr}
        onChange={(e) => {
          if (e.target.value) router.push(`/?date=${e.target.value}`);
        }}
        className="rounded-[var(--radius-sm)] border px-2 py-1 text-sm"
        style={{
          borderColor: "var(--color-rule)",
          color: "var(--color-ink)",
          fontFamily: "var(--font-body)",
          background: "var(--color-paper)",
        }}
        aria-label="日付を選択"
      />
    </nav>
  );
}
