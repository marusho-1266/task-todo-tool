import { isTodoStatus, type Task, type Todo } from "@/lib/types";

export const INBOX_PROJECT_NAME = "Inbox";

export const TODO_WITH_TASK_SELECT =
  "id, user_id, task_id, date, scheduled_start, planned_minutes, status, is_ad_hoc, tasks(id, title, project_id, actual_minutes, is_leaf)" as const;

function parseTask(value: unknown): Task | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;

  return {
    id: row.id,
    title: row.title,
    project_id: typeof row.project_id === "string" ? row.project_id : null,
    actual_minutes:
      typeof row.actual_minutes === "number" ? row.actual_minutes : 0,
    is_leaf: typeof row.is_leaf === "boolean" ? row.is_leaf : true,
  };
}

function parseTodoRow(value: unknown): Todo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.task_id !== "string" ||
    typeof row.date !== "string" ||
    typeof row.planned_minutes !== "number" ||
    !isTodoStatus(row.status)
  ) {
    return null;
  }

  let tasks: Task | null = null;
  if (row.tasks !== null && row.tasks !== undefined) {
    tasks = parseTask(row.tasks);
    if (!tasks) return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    task_id: row.task_id,
    date: row.date,
    scheduled_start:
      typeof row.scheduled_start === "string" ? row.scheduled_start : null,
    planned_minutes: row.planned_minutes,
    status: row.status,
    is_ad_hoc: typeof row.is_ad_hoc === "boolean" ? row.is_ad_hoc : false,
    tasks,
  };
}

export function parseTodoRows(data: unknown): Todo[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const todo = parseTodoRow(row);
    return todo ? [todo] : [];
  });
}
