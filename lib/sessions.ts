import { isValidWorkSessionSource, type WorkSession } from "@/lib/types";

export const WORK_SESSION_SELECT =
  "id, task_id, todo_id, started_at, ended_at, duration_minutes, source, todos(id, tasks(title))" as const;

function parseWorkSession(value: unknown): WorkSession | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.task_id !== "string" ||
    typeof row.todo_id !== "string" ||
    typeof row.started_at !== "string"
  ) {
    return null;
  }

  let todos: WorkSession["todos"] = null;
  if (row.todos !== null && row.todos !== undefined) {
    if (typeof row.todos !== "object") return null;
    const todoRow = row.todos as Record<string, unknown>;
    if (typeof todoRow.id !== "string") return null;
    let tasks: { title: string } | null = null;
    if (todoRow.tasks !== null && todoRow.tasks !== undefined) {
      if (typeof todoRow.tasks !== "object") return null;
      const taskRow = todoRow.tasks as Record<string, unknown>;
      if (typeof taskRow.title !== "string") return null;
      tasks = { title: taskRow.title };
    }
    todos = { id: todoRow.id, tasks };
  }

  return {
    id: row.id,
    task_id: row.task_id,
    todo_id: row.todo_id,
    started_at: row.started_at,
    ended_at: typeof row.ended_at === "string" ? row.ended_at : null,
    duration_minutes:
      typeof row.duration_minutes === "number" ? row.duration_minutes : null,
    source: isValidWorkSessionSource(row.source) ? row.source : null,
    todos,
  };
}

export function parseWorkSessions(data: unknown): WorkSession[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const session = parseWorkSession(row);
    return session ? [session] : [];
  });
}
