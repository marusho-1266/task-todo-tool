import { getSessionDisplayTitle } from "@/lib/interrupt";
import { sessionDurationMinutes } from "@/lib/timeline-blocks";
import {
  datetimeFromMinutes,
  formatTimeLabel,
  minutesFromDayStart,
  scheduledEndMinutes,
} from "@/lib/time";
import type { Todo, TodoStatus, WorkSession, WorkSessionSource } from "@/lib/types";

const CSV_HEADERS = [
  "種別",
  "日付",
  "タイトル",
  "開始時刻",
  "終了時刻",
  "分数",
  "Todo ID",
  "セッションID",
  "ステータス",
  "ソース",
] as const;

type TimelineCsvRow = {
  kind: "計画" | "実績";
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  minutes: string;
  todoId: string;
  sessionId: string;
  status: string;
  source: string;
  sortMinutes: number;
};

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatClockTime(isoOrDate: string | Date): string {
  const dt = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return formatTimeLabel(dt.getHours(), dt.getMinutes());
}

function todoStatusLabel(status: TodoStatus): string {
  switch (status) {
    case "pending":
      return "未完了";
    case "done":
      return "完了";
    case "rolled_over":
      return "繰越済";
  }
}

function sessionSourceLabel(source: WorkSessionSource | null): string {
  switch (source) {
    case "timer":
      return "タイマー";
    case "manual":
      return "手動";
    case "edited":
      return "修正";
    default:
      return "";
  }
}

function exportSessionDuration(session: WorkSession, now: Date): number {
  if (session.ended_at) {
    return sessionDurationMinutes(session);
  }
  const start = new Date(session.started_at);
  return Math.max(1, Math.round((now.getTime() - start.getTime()) / 60_000));
}

function buildPlanRows(date: string, todos: Todo[]): TimelineCsvRow[] {
  return todos
    .filter((todo) => todo.scheduled_start && !todo.is_ad_hoc)
    .map((todo) => {
      const startDt = new Date(todo.scheduled_start!);
      const endMinutes = scheduledEndMinutes(
        todo.scheduled_start!,
        todo.planned_minutes,
        date,
      );
      const endDt = datetimeFromMinutes(date, endMinutes);

      return {
        kind: "計画",
        date,
        title: todo.tasks?.title ?? "（無題）",
        startTime: formatClockTime(startDt),
        endTime: formatClockTime(endDt),
        minutes: String(todo.planned_minutes),
        todoId: todo.id,
        sessionId: "",
        status: todoStatusLabel(todo.status),
        source: "",
        sortMinutes: minutesFromDayStart(todo.scheduled_start!, date),
      };
    });
}

function buildActualRows(
  date: string,
  sessions: WorkSession[],
  now: Date,
): TimelineCsvRow[] {
  return sessions.map((session) => {
    const startDt = new Date(session.started_at);
    const duration = exportSessionDuration(session, now);
    const isActive = !session.ended_at;
    const endDt = session.ended_at ? new Date(session.ended_at) : null;

    return {
      kind: "実績",
      date,
      title: getSessionDisplayTitle(session),
      startTime: formatClockTime(startDt),
      endTime: endDt ? formatClockTime(endDt) : "",
      minutes: String(duration),
      todoId: session.todo_id,
      sessionId: session.id,
      status: isActive ? "計測中" : "完了",
      source: sessionSourceLabel(session.source),
      sortMinutes: minutesFromDayStart(session.started_at, date),
    };
  });
}

function rowToCsvLine(row: TimelineCsvRow): string {
  return [
    row.kind,
    row.date,
    row.title,
    row.startTime,
    row.endTime,
    row.minutes,
    row.todoId,
    row.sessionId,
    row.status,
    row.source,
  ]
    .map((value) => escapeCsvField(value))
    .join(",");
}

export function buildTimelineCsv(
  date: string,
  placedTodos: Todo[],
  daySessions: WorkSession[],
  now: Date = new Date(),
): string {
  const rows = [
    ...buildPlanRows(date, placedTodos),
    ...buildActualRows(date, daySessions, now),
  ].sort((a, b) => a.sortMinutes - b.sortMinutes || a.kind.localeCompare(b.kind, "ja"));

  const lines = [CSV_HEADERS.join(","), ...rows.map(rowToCsvLine)];
  return lines.join("\r\n");
}

export function hasTimelineExportData(
  placedTodos: Todo[],
  daySessions: WorkSession[],
): boolean {
  return (
    placedTodos.some((todo) => todo.scheduled_start && !todo.is_ad_hoc) ||
    daySessions.length > 0
  );
}

export function downloadTimelineCsv(csv: string, date: string): void {
  if (typeof window === "undefined") return;
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `timeline-${date}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
