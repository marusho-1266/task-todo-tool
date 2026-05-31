import {
  durationMinutesBetween,
  formatTimeLabel,
  SNAP_MINUTES,
} from "@/lib/time";
import type { WorkSession } from "@/lib/types";

/** Hide block labels below this height; details shown via title tooltip. */
export const BLOCK_COMPACT_HEIGHT_PX = 36;

/** Left lane for plan (Todo) blocks. */
export const PLAN_LANE_CLASS = "absolute left-12 right-[46%]";

/** Right lane for actual (Session) blocks. */
export const ACTUAL_LANE_CLASS = "absolute left-[54%] right-2";

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

export function formatSessionSummary(session: WorkSession): string {
  const startDt = new Date(session.started_at);
  const timeLabel = formatTimeLabel(startDt.getHours(), startDt.getMinutes());
  return `${timeLabel}·${Math.round(sessionDurationMinutes(session))}分`;
}

export function formatSessionTooltip(
  session: WorkSession,
  title: string,
): string {
  return `実績 ${formatSessionSummary(session)} — ${title}`;
}

export function formatPlanTooltip(
  timeLabel: string,
  plannedMinutes: number,
  title: string,
): string {
  return `計画 ${timeLabel}·${plannedMinutes}分 — ${title}`;
}
