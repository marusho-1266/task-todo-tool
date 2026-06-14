import type { BacklogSortMode } from "./types";

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

export function readStoredSortMode(): BacklogSortMode | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(BACKLOG_SORT_STORAGE_KEY);
  const modes = ["project", "due_date_priority", "priority_due_date"];
  if (modes.includes(value as string)) return value as BacklogSortMode;
  return null;
}

export function persistSortMode(mode: BacklogSortMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BACKLOG_SORT_STORAGE_KEY, mode);
}
