export const BACKLOG_SIDEBAR_STORAGE_KEY = "task-todo-backlog-sidebar";

export function readStoredBacklogSidebarOpen(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(BACKLOG_SIDEBAR_STORAGE_KEY);
  if (value === "open") return true;
  if (value === "closed") return false;
  return null;
}

/** First visit: open on desktop, closed on mobile. */
export function getDefaultBacklogSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function persistBacklogSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKLOG_SIDEBAR_STORAGE_KEY, open ? "open" : "closed");
}

const BACKLOG_SORT_STORAGE_KEY = "task-todo-backlog-sort";

export function readStoredSortMode(): "project" | "due_date" | "priority" | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(BACKLOG_SORT_STORAGE_KEY);
  if (value === "project" || value === "due_date" || value === "priority") return value;
  return null;
}

export function persistSortMode(mode: "project" | "due_date" | "priority"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKLOG_SORT_STORAGE_KEY, mode);
}
