export type Project = {
  id: string;
  title: string;
  is_system: boolean;
};

export const BACKLOG_STATUSES = ["not_started", "in_progress", "done"] as const;
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];

export function isBacklogStatus(value: unknown): value is BacklogStatus {
  return (
    typeof value === "string" &&
    (BACKLOG_STATUSES as readonly string[]).includes(value)
  );
}

export type BacklogProject = {
  id: string;
  title: string;
  is_system: boolean;
  color: string | null;
  status: BacklogStatus;
  description: string | null;
  category: string | null;
};

export type Task = {
  id: string;
  title: string;
  project_id: string | null;
  actual_minutes: number;
  is_leaf: boolean;
};

export type BacklogTask = {
  id: string;
  title: string;
  project_id: string | null;
  parent_id: string | null;
  is_leaf: boolean;
  status: BacklogStatus;
  estimate_minutes: number | null;
  due_date: string | null;
  description: string | null;
  priority: number;
  completed_at: string | null;
};

export const BACKLOG_SORT_MODES = [
  "project",
  "due_date_priority",
  "priority_due_date",
] as const;
export type BacklogSortMode = (typeof BACKLOG_SORT_MODES)[number];

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
  is_ad_hoc: boolean;
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
  label: string | null;
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

export type CalendarEvent = {
  id: string;
  title: string;
  startMinutes: number;
  durationMinutes: number;
  isAllDay: boolean;
};
