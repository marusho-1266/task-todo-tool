"use client";

import { useState } from "react";
import { startAdHocSession } from "@/app/actions/sessions";
import { useToast } from "@/components/ui/Toast";

type Props = {
  date: string;
  onAdded?: () => void;
};

export function QuickAddModal({ date, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await startAdHocSession(label, date);
    setLoading(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("割込計測を開始しました", "success");
    setLabel("");
    setOpen(false);
    onAdded?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-transform hover:scale-105"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-accent-ink)",
          fontFamily: "var(--font-body)",
        }}
        aria-label="割込計測"
        title="割込計測（実績のみ・即開始）"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-hoc-session-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
          />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-md rounded-[var(--radius-md)] border p-5 shadow-lg"
            style={{
              background: "var(--color-paper)",
              borderColor: "var(--color-rule)",
            }}
          >
            <h2
              id="ad-hoc-session-title"
              className="text-base font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              割込計測
            </h2>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              タスクを作らず実績だけ記録します。入力後すぐ計測が始まります。
            </p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: 〇〇社からの問合せ"
              autoFocus
              required
              className="mt-4 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{
                borderColor: "var(--color-rule)",
                fontFamily: "var(--font-body)",
                color: "var(--color-ink)",
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium disabled:opacity-50 cursor-pointer"
                style={{
                  background: "var(--color-accent)",
                  color: "var(--color-accent-ink)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {loading ? "開始中…" : "計測開始"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
