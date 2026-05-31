import {
  durationMinutesBetween,
  formatTimeLabel,
  minutesFromDayStart,
  SNAP_MINUTES,
} from "@/lib/time";
import type { Todo, WorkSession } from "@/lib/types";

/** Hide block labels below this height; details shown via title tooltip. */
export const BLOCK_COMPACT_HEIGHT_PX = 36;

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function sessionDurationMinutes(session: WorkSession): number {
  if (session.duration_minutes != null) return session.duration_minutes;
  if (session.ended_at) {
    return durationMinutesBetween(
      new Date(session.started_at),
      new Date(session.ended_at),
    );
  }
  return SNAP_MINUTES;
}

export function planSessionRangesOverlap(
  todo: Todo,
  session: WorkSession,
  dateStr: string,
): boolean {
  if (!todo.scheduled_start || session.todo_id !== todo.id) return false;
  const planStart = minutesFromDayStart(todo.scheduled_start, dateStr);
  const planEnd = planStart + todo.planned_minutes;
  const sessionStart = minutesFromDayStart(session.started_at, dateStr);
  const sessionEnd = sessionStart + sessionDurationMinutes(session);
  return rangesOverlap(planStart, planEnd, sessionStart, sessionEnd);
}

export function getLinkedSessionsByTodoId(
  placedTodos: Todo[],
  daySessions: WorkSession[],
): Map<string, WorkSession[]> {
  const todoIds = new Set(placedTodos.map((t) => t.id));
  const map = new Map<string, WorkSession[]>();
  for (const session of daySessions) {
    if (!todoIds.has(session.todo_id)) continue;
    const list = map.get(session.todo_id) ?? [];
    list.push(session);
    map.set(session.todo_id, list);
  }
  return map;
}

export function getOverlappingLinkedSessions(
  todo: Todo,
  sessions: WorkSession[],
  dateStr: string,
): WorkSession[] {
  return sessions
    .filter((s) => planSessionRangesOverlap(todo, s, dateStr))
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
}

export function getPairedSessionIds(
  placedTodos: Todo[],
  daySessions: WorkSession[],
  dateStr: string,
): Set<string> {
  const linked = getLinkedSessionsByTodoId(placedTodos, daySessions);
  const paired = new Set<string>();
  for (const todo of placedTodos) {
    if (!todo.scheduled_start) continue;
    const sessions = linked.get(todo.id) ?? [];
    for (const session of getOverlappingLinkedSessions(todo, sessions, dateStr)) {
      paired.add(session.id);
    }
  }
  return paired;
}

export function formatSessionSummary(session: WorkSession): string {
  const startDt = new Date(session.started_at);
  const timeLabel = formatTimeLabel(startDt.getHours(), startDt.getMinutes());
  return `${timeLabel}·${Math.round(sessionDurationMinutes(session))}分`;
}

export function formatMergedPlanActualHeader(
  planTimeLabel: string,
  plannedMinutes: number,
  linkedSessions: WorkSession[],
): string {
  const actualPart = linkedSessions
    .map((s) => formatSessionSummary(s))
    .join(" / ");
  return `計画 ${planTimeLabel}·${plannedMinutes}分 ｜ 実績 ${actualPart}`;
}

export function formatSessionTooltip(
  session: WorkSession,
  title: string,
): string {
  return `実績 ${formatSessionSummary(session)} — ${title}`;
}
