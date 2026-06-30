"use client";

import { PX_PER_MINUTE } from "@/lib/time";
import type { CalendarEvent } from "@/lib/types";

type Props = {
  event: CalendarEvent;
};

function formatTime(totalMinutes: number, baseHour: number): string {
  const abs = baseHour * 60 + totalMinutes;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function CalendarEventBlock({ event }: Props) {
  const top = event.startMinutes * PX_PER_MINUTE;
  const height = Math.max(event.durationMinutes * PX_PER_MINUTE, 18);

  const BASE_HOUR = 6;
  const startLabel = formatTime(event.startMinutes, BASE_HOUR);
  const endLabel = formatTime(event.startMinutes + event.durationMinutes, BASE_HOUR);
  const tooltip = `${event.title}\n${startLabel}〜${endLabel}`;

  return (
    <div
      className="absolute left-0 right-0 rounded border border-blue-300 bg-blue-100 px-1 overflow-hidden pointer-events-none"
      style={{ top, height }}
      title={tooltip}
    >
      <span className="block truncate text-xs text-blue-800 leading-tight mt-0.5">
        {event.title}
      </span>
    </div>
  );
}
