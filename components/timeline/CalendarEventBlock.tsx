"use client";

import { startAdHocSession } from "@/app/actions/sessions";
import { useToast } from "@/components/ui/Toast";
import { PX_PER_MINUTE, TIMELINE_START_HOUR } from "@/lib/time";
import { PLAN_LANE_CLASS } from "@/lib/timeline-blocks";
import type { CalendarEvent } from "@/lib/types";

type Props = {
  event: CalendarEvent;
  date: string;
  onStarted: () => void;
};

function formatTime(totalMinutes: number, baseHour: number): string {
  const abs = baseHour * 60 + totalMinutes;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function CalendarEventBlock({ event, date, onStarted }: Props) {
  const { showToast } = useToast();
  const top = event.startMinutes * PX_PER_MINUTE;
  const height = Math.max(event.durationMinutes * PX_PER_MINUTE, 18);

  const startLabel = formatTime(event.startMinutes, TIMELINE_START_HOUR);
  const endLabel = formatTime(event.startMinutes + event.durationMinutes, TIMELINE_START_HOUR);
  const tooltip = `${event.title}\n${startLabel}〜${endLabel}`;

  async function handleStart() {
    const result = await startAdHocSession(event.title, date);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("計測を開始しました", "success");
    onStarted();
  }

  return (
    <div
      className={`${PLAN_LANE_CLASS} rounded border border-blue-300 bg-blue-100 px-1 overflow-hidden`}
      style={{ top, height, zIndex: 6 }}
      title={tooltip}
    >
      <div className="flex items-center gap-1">
        <span className="block min-w-0 flex-1 truncate text-xs text-blue-800 leading-tight mt-0.5">
          {event.title}
        </span>
        <button
          type="button"
          onClick={handleStart}
          className="shrink-0 rounded px-1 py-0.5 text-xs font-medium leading-none cursor-pointer"
          style={{ background: "var(--color-plan)", color: "var(--color-accent-ink)" }}
          title="計測開始"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
