"use client";

import { useState } from "react";
import { addManualSession } from "@/app/actions/sessions";
import { useToast } from "@/components/ui/Toast";
import type { Todo } from "@/lib/types";

type Props = {
  placedTodos: Todo[];
  onClose: () => void;
  onSaved: () => void;
  embedded?: boolean;
  previewState?:
    | "default"
    | "hover"
    | "focus"
    | "active"
    | "disabled"
    | "error"
    | "loading"
    | "success";
};

export type ManualSessionModalPreviewState = NonNullable<Props["previewState"]>;

const dateTimeInputClassName =
  "mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] transition-[color,background-color,border-color,box-shadow] duration-150 outline-none hover:border-[var(--color-rule-strong)] focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-soft)] active:bg-[var(--color-paper-2)]";

const selectClassName =
  "mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none hover:border-[var(--color-rule-strong)] hover:shadow-[var(--shadow-soft)] focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-soft)] active:scale-[0.99] active:bg-[var(--color-paper-2)] disabled:cursor-not-allowed disabled:opacity-50";

const modalSecondaryButtonClassName =
  "rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none hover:bg-[var(--color-paper-2)] focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent-soft)] active:scale-[0.98] active:bg-[var(--color-paper-3)] disabled:cursor-not-allowed disabled:opacity-50";

const modalPrimaryButtonClassName =
  "rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] active:scale-[0.98] active:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";

export function ManualSessionModal({
  placedTodos,
  onClose,
  onSaved,
  embedded = false,
  previewState,
}: Props) {
  const { showToast } = useToast();
  const previewLoading = previewState === "loading";
  const [loading, setLoading] = useState(previewLoading);
  const [todoId, setTodoId] = useState(placedTodos[0]?.id ?? "");

  function toLocalInputValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [startedAt, setStartedAt] = useState(toLocalInputValue(hourAgo));
  const [endedAt, setEndedAt] = useState(toLocalInputValue(now));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!todoId) {
      showToast("Todo を選択してください");
      return;
    }
    setLoading(true);
    const result = await addManualSession(
      todoId,
      new Date(startedAt).toISOString(),
      new Date(endedAt).toISOString(),
    );
    setLoading(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("セッションを追加しました", "success");
    onSaved();
    onClose();
  }

  return (
    <div
      className={
        embedded
          ? "relative min-h-[28rem] w-full overflow-hidden rounded-[var(--radius-md)] border"
          : "fixed inset-0 z-50 flex items-center justify-center p-4"
      }
      style={embedded ? { borderColor: "var(--color-rule)" } : undefined}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="preview-interactive absolute inset-0 bg-black/20 transition-colors duration-150 outline-none hover:bg-black/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent-soft)] active:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onClose}
        disabled={loading || previewState === "disabled"}
        aria-label="閉じる"
      />
      <form
        onSubmit={handleSubmit}
        data-preview-state={previewState}
        className={`relative w-full max-w-md rounded-[var(--radius-md)] border p-5 shadow-lg${embedded ? " mx-auto mt-8" : ""}`}
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-rule)",
        }}
      >
        <h2
          className="text-base font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          過去セッションを追加
        </h2>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
        >
          開始・終了時刻は必須です
        </p>

        {previewState === "error" && (
          <p
            className="mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-xs"
            role="alert"
            style={{
              borderColor: "var(--color-warn-border)",
              background: "var(--color-warn-soft)",
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            終了時刻は開始時刻より後にしてください
          </p>
        )}

        {previewState === "success" && (
          <p
            className="mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-xs"
            role="status"
            style={{
              borderColor: "oklch(72% 0.08 145)",
              background: "oklch(94% 0.04 145)",
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            セッションを追加しました
          </p>
        )}

        <label className="mt-4 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Todo
          <select
            value={todoId}
            onChange={(e) => setTodoId(e.target.value)}
            required
            disabled={loading || placedTodos.length === 0 || previewState === "disabled"}
            className={`${selectClassName} preview-interactive`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            {placedTodos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tasks?.title ?? "（無題）"}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          開始
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            required
            disabled={loading || previewState === "disabled"}
            className={`${dateTimeInputClassName} preview-interactive`}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </label>

        <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          終了
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            required
            disabled={loading || previewState === "disabled"}
            className={`${dateTimeInputClassName} preview-interactive`}
            style={{ fontFamily: "var(--font-body)" }}
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || previewState === "disabled"}
            className={`${modalSecondaryButtonClassName} preview-interactive preview-secondary-btn`}
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading || placedTodos.length === 0 || previewState === "disabled"}
            className={`${modalPrimaryButtonClassName} preview-interactive preview-primary-btn`}
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
            }}
          >
            {loading ? "追加中…" : "追加"}
          </button>
        </div>
      </form>
    </div>
  );
}
