"use client";

import { useState } from "react";
import { createProject, updateProject } from "@/app/actions/projects";
import { useToast } from "@/components/ui/Toast";
import type { BacklogProject, BacklogStatus } from "@/lib/types";
import { isBacklogStatus } from "@/lib/types";

type Props = {
  project: BacklogProject | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: (id: string) => void;
};

export function ProjectModal({ project, onClose, onSaved, onDelete }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(project?.title ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<BacklogStatus>(project?.status ?? "not_started");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (project) {
      const result = await updateProject(project.id, {
        title,
        category: category.trim() || null,
        description: description.trim() || null,
        status,
      });
      setLoading(false);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("プロジェクトを更新しました", "success");
    } else {
      const result = await createProject(title, category);
      setLoading(false);
      if (!result.success) {
        showToast(result.error);
        return;
      }
      showToast("プロジェクトを作成しました", "success");
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/20" onClick={onClose} aria-label="閉じる" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-[var(--radius-md)] border p-5 shadow-lg"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-rule)" }}
      >
        <h2 className="text-base font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
          {project ? "プロジェクト編集" : "プロジェクト作成"}
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

        <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
          カテゴリ
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        {project && (
          <label className="mt-3 block text-xs" style={{ color: "var(--color-ink-muted)" }}>
            ステータス
            <select
              value={status}
              onChange={(e) => {
                if (isBacklogStatus(e.target.value)) setStatus(e.target.value);
              }}
              className="mt-1 w-full rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            >
              <option value="not_started">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="done">完了</option>
            </select>
          </label>
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
          {project && !project.is_system && onDelete ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (window.confirm("このプロジェクトを削除しますか？")) {
                  onDelete(project.id);
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
