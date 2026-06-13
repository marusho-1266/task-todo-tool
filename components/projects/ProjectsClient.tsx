"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { deleteProject, reassignAndDeleteProject } from "@/app/actions/projects";
import { useToast } from "@/components/ui/Toast";
import { ProjectModal } from "@/components/backlog/ProjectModal";
import type { BacklogProject } from "@/lib/types";

type Project = BacklogProject & { task_count: number };

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  async function handleDeleteProject(id: string, taskCount: number) {
    if (taskCount === 0) {
      const res = await deleteProject(id);
      if (!res.success) {
        showToast(res.error);
      } else {
        showToast("プロジェクトを削除しました", "success");
        router.refresh();
      }
    } else {
      if (
        window.confirm("このプロジェクトにはタスクがあります。タスクをInboxに移動してから削除しますか？")
      ) {
        const res = await reassignAndDeleteProject(id);
        if (!res.success) {
          showToast(res.error);
        } else {
          showToast("プロジェクトを削除しました", "success");
          router.refresh();
        }
      }
    }
  }

  const statusLabels: Record<string, string> = {
    not_started: "未着手",
    in_progress: "進行中",
    done: "完了",
  };

  return (
    <div
      className="flex h-dvh min-h-0 flex-col overflow-hidden"
      style={{ background: "var(--color-paper)" }}
    >
      <header
        className="border-b px-4 py-4"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-medium" style={{ fontFamily: "var(--font-display)" }}>
            プロジェクト管理
          </h1>
          <Link
            href="/"
            className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          {projects.length === 0 ? (
            <p style={{ color: "var(--color-ink-muted)" }}>プロジェクトがありません</p>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-md)] border" style={{ borderColor: "var(--color-rule)" }}>
              <table className="w-full text-xs" style={{ color: "var(--color-ink)" }}>
                <thead className="border-b" style={{ borderColor: "var(--color-rule)", background: "var(--color-paper-2)" }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">タイトル</th>
                    <th className="px-4 py-3 text-left font-medium">カテゴリ</th>
                    <th className="px-4 py-3 text-left font-medium">ステータス</th>
                    <th className="px-4 py-3 text-center font-medium">タスク数</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b transition-colors hover:bg-[var(--color-paper-2)]"
                      style={{ borderColor: "var(--color-rule)" }}
                    >
                      <td className="px-4 py-3 font-medium">
                        {project.title}
                        {project.is_system && (
                          <span
                            className="ml-2 inline-block rounded px-2 py-0.5 text-xs"
                            style={{ background: "var(--color-accent-soft)", color: "var(--color-accent)" }}
                          >
                            システム
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-ink-muted)" }}>
                        {project.category || "-"}
                      </td>
                      <td className="px-4 py-3">{statusLabels[project.status] || project.status}</td>
                      <td className="px-4 py-3 text-center">{project.task_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditProject(project);
                              setShowProjectModal(true);
                            }}
                            className="rounded-[var(--radius-sm)] border px-2 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
                            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
                          >
                            編集
                          </button>
                          {!project.is_system && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(project.id, project.task_count)}
                              className="rounded-[var(--radius-sm)] border px-2 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
                              style={{ borderColor: "var(--color-warn-border)", color: "var(--color-warn)" }}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showProjectModal && editProject && (
        <ProjectModal
          project={editProject}
          onClose={() => {
            setShowProjectModal(false);
            setEditProject(null);
          }}
          onSaved={() => {
            setShowProjectModal(false);
            setEditProject(null);
            router.refresh();
          }}
          onDelete={async (id) => {
            const taskCount = editProject.task_count;
            if (taskCount === 0) {
              const res = await deleteProject(id);
              if (!res.success) showToast(res.error);
              else {
                showToast("プロジェクトを削除しました", "success");
                setEditProject(null);
                router.refresh();
              }
            } else {
              if (window.confirm("このプロジェクトにはタスクがあります。タスクをInboxに移動してから削除しますか？")) {
                const res = await reassignAndDeleteProject(id);
                if (!res.success) showToast(res.error);
                else {
                  showToast("プロジェクトを削除しました", "success");
                  setEditProject(null);
                  router.refresh();
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}
