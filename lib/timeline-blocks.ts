import {
  durationMinutesBetween,
  formatTimeLabel,
  SNAP_MINUTES,
} from "@/lib/time";
import type { WorkSession } from "@/lib/types";

/** Timeline slot height required for plan/actual 3-line layout (label + time + title). */
export const BLOCK_FULL_LAYOUT_MIN_HEIGHT_PX = 68;

/** Use single-line row layout below this height (~57 min at 1.2px/min). */
export const BLOCK_SHORT_LAYOUT_HEIGHT_PX = BLOCK_FULL_LAYOUT_MIN_HEIGHT_PX;

/** @deprecated Use BLOCK_SHORT_LAYOUT_HEIGHT_PX */
export const BLOCK_COMPACT_HEIGHT_PX = BLOCK_SHORT_LAYOUT_HEIGHT_PX;

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
