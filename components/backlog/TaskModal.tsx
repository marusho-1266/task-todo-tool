"use client";

import { useState } from "react";
import { createTask, updateTask } from "@/app/actions/tasks";
import { useToast } from "@/components/ui/Toast";
import type { BacklogProject, BacklogStatus, BacklogTask } from "@/lib/types";
import { isBacklogStatus } from "@/lib/types";

type Props = {
  task: BacklogTask | null;
  projects: BacklogProject[];
  defaultParentId?: string | null;
  defaultProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: string) => void;
};

export function TaskModal({
  task,
  projects,
  defaultParentId = null,
  defaultProjectId = null,
  onClose,
  onSaved,
  onDelete,
}: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(task?.title ?? "");
  const [projectId, setProjectId] = useState<string>(
    task?.project_id ?? defaultProjectId ?? projects.find((p) => p.title === "Inbox")?.id ?? "",
  );
  const [status, setStatus] = useState<BacklogStatus>(task?.status ?? "not_started");
  const [estimateMinutes, setEstimateMinutes] = useState(
    task?.estimate_minutes?.toString() ?? "",
  );
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<number>(task?.priority ?? 0);

  const isChild = Boolean(task?.parent_id ?? defaultParentId);
  const isParent = task ? !task.is_leaf : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let estimate: number | null = null;
    const trimmedEstimate = estimateMinutes.trim();
    if (trimmedEstimate) {
      const parsed = parseInt(trimmedEstimate, 10);
      if (Number.isNaN(parsed)) {
        setLoading(false);
        showToast("見積は数値で入力してください");
        return;
      }
      estimate = parsed;
    }

    if (task) {
      const result = await updateTask(task.id, {
        title,
        status,
        description: description.trim() || null,
        estimateMinutes: estimate,
        dueDate: dueDate || null,
        projectId: isChild ? undefined : projectId || null,
        priority,
      });
      setLoading(false);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("タスクを更新しました", "success");
    } else {
      const result = await createTask({
        title,
        projectId: defaultParentId ? undefined : projectId || null,
        parentId: defaultParentId,
        estimateMinutes: estimate,
        dueDate: dueDate || null,
        description: description.trim() || null,
        priority,
      });
      setLoading(false);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("タスクを作成しました", "success");
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="閉じる" />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-md)] border p-5 shadow-lg"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-rule)" }}
      >
        <h2 className="text-base font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
          {task ? "タスク編集" : defaultParentId ? "子タスク作成" : "タスク作成"}
        </h2>

        <label className="mt-4 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          タイトル
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        {!isChild && !defaultParentId && (
          <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
            プロジェクト
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            >
              <option value="">なし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}

        {task && (
          <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
            ステータス
            <select
              value={status}
              onChange={(e) => {
                if (isBacklogStatus(e.target.value)) setStatus(e.target.value);
              }}
              disabled={isParent}
              className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            >
              <option value="not_started">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="done">完了</option>
            </select>
          </label>
        )}

        {!isParent && (
          <>
            <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
              見積（分）
              <input
                type="number"
                min={10}
                step={10}
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>

            <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
              期限
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>

            <div className="mt-3">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>優先度</span>
              <div className="mt-1 flex gap-1">
                {([0, 1, 2] as const).map((level) => {
                  const labels = ["低", "中", "高"] as const;
                  const active = priority === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      className="flex-1 rounded-[var(--radius-sm)] border py-1 text-sm transition-colors"
                      style={{
                        borderColor: active ? "var(--color-accent)" : "var(--color-rule)",
                        background: active ? "var(--color-accent)" : "transparent",
                        color: active ? "var(--color-accent-ink)" : "var(--color-ink-muted)",
                      }}
                    >
                      {labels[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          説明
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        <div className="mt-4 flex justify-between gap-2">
          {task && onDelete && !isParent ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (window.confirm("このタスクを削除しますか？")) {
                  onDelete(task.id);
                }
              }}
              className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-warn-border)", color: "var(--color-warn)" }}
            >
              削除
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
              style={{ background: "var(--color-accent)", color: "var(--color-accent-ink)" }}
            >
              {loading ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
