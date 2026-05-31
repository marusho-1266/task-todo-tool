export type Project = {
  id: string;
  title: string;
  is_system: boolean;
};

export type Task = {
  id: string;
  title: string;
  project_id: string | null;
  actual_minutes: number;
  is_leaf: boolean;
};

export const TODO_STATUSES = ["pending", "done", "rolled_over"] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export function isTodoStatus(value: unknown): value is TodoStatus {
  return (
    typeof value === "string" &&
    (TODO_STATUSES as readonly string[]).includes(value)
  );
}

export type Todo = {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  scheduled_start: string | null;
  planned_minutes: number;
  status: TodoStatus;
  tasks: Task | null;
};

export const WORK_SESSION_SOURCES = ["timer", "manual", "edited"] as const;
export type WorkSessionSource = (typeof WORK_SESSION_SOURCES)[number];

export function isValidWorkSessionSource(
  value: unknown,
): value is WorkSessionSource {
  return (
    typeof value === "string" &&
    (WORK_SESSION_SOURCES as readonly string[]).includes(value)
  );
}

export type WorkSession = {
  id: string;
  task_id: string;
  todo_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  source: WorkSessionSource | null;
  todos: {
    id: string;
    tasks: { title: string } | null;
  } | null;
};

export type Profile = {
  work_day_start: string;
};

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
