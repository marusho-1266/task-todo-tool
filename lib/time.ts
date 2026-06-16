/** Returns today's date in JST (UTC+9), safe to call from server where TZ may be UTC. */
export function getTodayJST(): Date {
  const jstMs = Date.now() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  return new Date(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

/** Timeline display: 06:00–22:00 */
export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 22;
export const GRID_MINUTES = 15;
export const SNAP_MINUTES = 10;
export const PX_PER_MINUTE = 1.2;

export function getTimelineTotalMinutes(): number {
  return (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
}

export function getTimelineHeightPx(): number {
  return getTimelineTotalMinutes() * PX_PER_MINUTE;
}

export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateParam(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getTodayJST();
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function isToday(date: Date): boolean {
  return formatDateParam(date) === formatDateParam(getTodayJST());
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function minutesFromDayStart(
  iso: string,
  dateStr: string,
): number {
  const dt = new Date(iso);
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, TIMELINE_START_HOUR, 0, 0, 0);
  return Math.max(0, (dt.getTime() - dayStart.getTime()) / 60_000);
}

/** UTC-offset-aware version for server-side calculations. utcOffsetMinutes = +540 for JST. */
export function minutesFromDayStartWithOffset(
  iso: string,
  dateStr: string,
  utcOffsetMinutes: number,
): number {
  const dt = new Date(iso);
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStartMs =
    Date.UTC(y, m - 1, d, TIMELINE_START_HOUR, 0, 0, 0) -
    utcOffsetMinutes * 60_000;
  return Math.max(0, (dt.getTime() - dayStartMs) / 60_000);
}

/** UTC-offset-aware version for server-side calculations. utcOffsetMinutes = +540 for JST. */
export function datetimeFromMinutesWithOffset(
  dateStr: string,
  minutes: number,
  utcOffsetMinutes: number,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = TIMELINE_START_HOUR * 60 + snapMinutes(minutes);
  const utcMs =
    Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (total - utcOffsetMinutes) * 60_000;
  return new Date(utcMs);
}

export function scheduledEndMinutes(
  scheduledStart: string,
  plannedMinutes: number,
  dateStr: string,
): number {
  return minutesFromDayStart(scheduledStart, dateStr) + plannedMinutes;
}

export function datetimeFromMinutes(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = TIMELINE_START_HOUR * 60 + snapMinutes(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return new Date(y, m - 1, d, hours, mins, 0, 0);
}

export function slotIndexToMinutes(index: number): number {
  return index * SNAP_MINUTES;
}

export function minutesToSlotIndex(minutes: number): number {
  return Math.round(snapMinutes(minutes) / SNAP_MINUTES);
}

export function getSlotCount(): number {
  return getTimelineTotalMinutes() / SNAP_MINUTES;
}

export function formatTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function durationMinutesBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** JST calendar day bounds for session queries (00:00:00.000 JST – 23:59:59.999 JST). */
export function dayBounds(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - JST_OFFSET_MS),
    end: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - JST_OFFSET_MS),
  };
}
