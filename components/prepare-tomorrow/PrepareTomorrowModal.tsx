"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCarryOverCandidates,
  prepareTomorrow,
} from "@/app/actions/prepare-tomorrow";
import { addDaysToDateStr } from "@/lib/prepare-tomorrow";
import { formatDisplayDate, formatTimeLabel } from "@/lib/time";
import type { Todo } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

type Props = {
  todayDateStr: string;
  initialCandidates: Todo[];
  onClose: () => void;
};

type TaskGroup = {
  taskId: string;
  title: string;
  todos: Todo[];
  totalMinutes: number;
};

function groupCandidatesByTask(candidates: Todo[]): TaskGroup[] {
  const order: string[] = [];
  const byTask = new Map<string, Todo[]>();

  for (const todo of candidates) {
    if (!byTask.has(todo.task_id)) {
      order.push(todo.task_id);
    }
    const group = byTask.get(todo.task_id) ?? [];
    group.push(todo);
    byTask.set(todo.task_id, group);
  }

  return order.map((taskId) => {
    const todos = byTask.get(taskId)!;
    return {
      taskId,
      title: todos[0].tasks?.title ?? "（無題）",
      todos,
      totalMinutes: todos.reduce((sum, t) => sum + t.planned_minutes, 0),
    };
  });
}

function formatTodoSlot(todo: Todo): string {
  if (!todo.scheduled_start) {
    return `${todo.planned_minutes}分 · 未配置`;
  }
  const dt = new Date(todo.scheduled_start);
  const time = formatTimeLabel(dt.getHours(), dt.getMinutes());
  return `${time} · ${todo.planned_minutes}分`;
}

export function PrepareTomorrowModal({
  todayDateStr,
  initialCandidates,
  onClose,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => {
    const groups = groupCandidatesByTask(initialCandidates);
    return new Set(groups.map((g) => g.taskId));
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const taskGroups = useMemo(
    () => groupCandidatesByTask(candidates),
    [candidates],
  );

  const tomorrowDateStr = addDaysToDateStr(todayDateStr, 1);
  const tomorrowLabel = useMemo(() => {
    const [y, m, d] = tomorrowDateStr.split("-").map(Number);
    return formatDisplayDate(new Date(y, m - 1, d));
  }, [tomorrowDateStr]);

  function toggleTask(taskId: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedTaskIds(new Set(taskGroups.map((g) => g.taskId)));
    } else {
      setSelectedTaskIds(new Set());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await prepareTomorrow(todayDateStr, [...selectedTaskIds]);

      if (!result.success) {
        showToast(result.error);
        return;
      }

      const { tomorrowDate, placedCount, overflowTitles } = result.data!;

      if (overflowTitles.length > 0) {
        showToast(
          `${placedCount}件を配置しました。入りきらなかった ${overflowTitles.length}件は今日に残っています（未配置へは自動投入しません）`,
          "success",
        );
      } else {
        showToast(`${placedCount}件を明日のカレンダーに反映しました`, "success");
      }

      onClose();
      router.push(`/?date=${tomorrowDate}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCandidates() {
    setRefreshing(true);
    try {
      const fresh = await getCarryOverCandidates(todayDateStr);
      setCandidates(fresh);
      const groups = groupCandidatesByTask(fresh);
      setSelectedTaskIds(new Set(groups.map((g) => g.taskId)));
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "繰越候補の取得に失敗しました",
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepare-tomorrow-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="閉じる"
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-md)] border shadow-lg"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-rule)",
        }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-rule)" }}>
          <h2
            id="prepare-tomorrow-title"
            className="text-base font-medium"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            明日を準備
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {tomorrowLabel} のカレンダーに反映します
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="mb-5">
            <h3
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
            >
              定期（明日に該当）
            </h3>
            <p
              className="mt-2 rounded-[var(--radius-sm)] border px-3 py-2 text-xs"
              style={{
                borderColor: "var(--color-rule)",
                color: "var(--color-ink-faint)",
                background: "var(--color-paper-2)",
                fontFamily: "var(--font-body)",
              }}
            >
              P3 で実装予定（定期ルール統合）
            </p>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
              >
                今日の残り（繰越）
              </h3>
              {taskGroups.length > 0 && (
                <label
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.size === taskGroups.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  すべて
                </label>
              )}
            </div>

            {taskGroups.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
              >
                繰越対象の未完了 Todo がありません。
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {taskGroups.map((group) => {
                  const isSelected = selectedTaskIds.has(group.taskId);
                  const isMerged = group.todos.length > 1;

                  return (
                    <li key={group.taskId}>
                      <label
                        className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5"
                        style={{
                          borderColor: isSelected
                            ? "var(--color-accent)"
                            : "var(--color-rule)",
                          background: isSelected
                            ? "var(--color-accent-soft)"
                            : "var(--color-paper)",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={isSelected}
                          onChange={() => toggleTask(group.taskId)}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-sm font-medium"
                            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
                          >
                            {group.title}
                          </span>
                          <span
                            className="mt-0.5 block text-xs"
                            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                          >
                            {isMerged
                              ? `${group.todos.length}件 · 合算 ${group.totalMinutes}分`
                              : `${group.totalMinutes}分`}
                            {isSelected
                              ? ` · 翌日 ${group.totalMinutes}分`
                              : ""}
                          </span>
                          {isMerged && (
                            <ul
                              className="mt-1.5 flex flex-col gap-0.5 text-xs"
                              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
                            >
                              {group.todos.map((todo) => (
                                <li key={todo.id}>· {formatTodoSlot(todo)}</li>
                              ))}
                            </ul>
                          )}
                          {!isMerged && group.todos[0] && (
                            <span
                              className="mt-0.5 block text-xs"
                              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
                            >
                              {group.todos[0].scheduled_start ? "配置済み" : "未配置"}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div
          className="flex justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <button
            type="button"
            onClick={onClose}
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
            type="button"
            onClick={() => refreshCandidates()}
            disabled={refreshing || loading}
            className="rounded-[var(--radius-sm)] border px-3 py-1.5 text-sm disabled:opacity-50"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {refreshing ? "更新中…" : "更新"}
          </button>
          <button
            type="submit"
            disabled={loading || selectedTaskIds.size === 0}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            {loading ? "反映中…" : "明日のカレンダーに反映"}
          </button>
        </div>
      </form>
    </div>
  );
}
