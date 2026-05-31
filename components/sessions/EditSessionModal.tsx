"use client";

import { useState } from "react";
import { editSessionTimes } from "@/app/actions/sessions";
import { useToast } from "@/components/ui/Toast";
import type { WorkSession } from "@/lib/types";

type Props = {
  session: WorkSession;
  onClose: () => void;
  onSaved: () => void;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditSessionModal({ session, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const defaultEnd = session.ended_at
    ? new Date(session.ended_at)
    : new Date();

  const [startedAt, setStartedAt] = useState(
    toLocalInputValue(new Date(session.started_at)),
  );
  const [endedAt, setEndedAt] = useState(toLocalInputValue(defaultEnd));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (end <= start) {
      showToast("終了時刻は開始時刻より後にしてください");
      return;
    }
    setLoading(true);
    const result = await editSessionTimes(
      session.id,
      start.toISOString(),
      end.toISOString(),
    );
    setLoading(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("セッション時刻を更新しました", "success");
    onSaved();
    onClose();
  }

  const title = session.todos?.tasks?.title ?? "セッション";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
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
          className="text-base font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          セッション時刻を修正
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          {title}
        </p>
        <label className="mt-4 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          開始日時
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            required
            className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--color-rule)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
            }}
          />
        </label>
        <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          終了日時
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            required
            className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--color-rule)",
              fontFamily: "var(--font-body)",
              color: "var(--color-ink)",
            }}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
            }}
          >
            {loading ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
