"use client";

import { useState } from "react";
import { updateTodoSchedule } from "@/app/actions/todos";
import { useToast } from "@/components/ui/Toast";
import {
  formatDateParam,
  minutesFromDayStart,
} from "@/lib/time";
import type { Todo } from "@/lib/types";

type Props = {
  todo: Todo;
  onClose: () => void;
  onSaved: () => void;
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditTodoScheduleModal({ todo, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const scheduledDate = new Date(todo.scheduled_start!);
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(scheduledDate));
  const [plannedMinutes, setPlannedMinutes] = useState(todo.planned_minutes);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = new Date(scheduledAt);
    const date = formatDateParam(start);
    const startMinutes = minutesFromDayStart(start.toISOString(), date);
    setLoading(true);
    const result = await updateTodoSchedule(todo.id, date, startMinutes, plannedMinutes);
    setLoading(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("計画を更新しました", "success");
    onSaved();
    onClose();
  }

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
          計画を修正
        </h2>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          {todo.tasks?.title ?? "タスク"}
        </p>
        <label className="mt-4 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          開始日時
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
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
          予定分数
          <input
            type="number"
            min={5}
            step={5}
            value={plannedMinutes}
            onChange={(e) => setPlannedMinutes(Number(e.target.value))}
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
              disabled={loading}
              className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm disabled:opacity-50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{
                background: "var(--color-plan)",
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
