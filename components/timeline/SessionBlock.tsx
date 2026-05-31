"use client";

import { useEffect, useState } from "react";
import {
  formatSessionTooltip,
  BLOCK_COMPACT_HEIGHT_PX,
  sessionDurationMinutes,
} from "@/lib/timeline-blocks";
import {
  formatTimeLabel,
  minutesFromDayStart,
  PX_PER_MINUTE,
  SNAP_MINUTES,
} from "@/lib/time";
import type { WorkSession } from "@/lib/types";

type Props = {
  session: WorkSession;
  date: string;
  isActive: boolean;
  suppressLabel?: boolean;
  onEdit?: (session: WorkSession) => void;
};

export function SessionBlock({
  session,
  date,
  isActive,
  suppressLabel = false,
  onEdit,
}: Props) {
  const [liveMinutes, setLiveMinutes] = useState(SNAP_MINUTES);

  useEffect(() => {
    if (!isActive) return;
    const start = new Date(session.started_at).getTime();
    const tick = () => {
      setLiveMinutes(
        Math.max(SNAP_MINUTES, (Date.now() - start) / 60_000),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, session.started_at]);

  const durationMin = isActive
    ? liveMinutes
    : sessionDurationMinutes(session);
  const topPx = minutesFromDayStart(session.started_at, date) * PX_PER_MINUTE;
  const heightPx = Math.max(durationMin * PX_PER_MINUTE, SNAP_MINUTES * PX_PER_MINUTE);
  const startDt = new Date(session.started_at);
  const timeLabel = formatTimeLabel(startDt.getHours(), startDt.getMinutes());
  const title = session.todos?.tasks?.title ?? "（無題）";
  const durationDisplay = Math.round(durationMin);
  const canEdit = !isActive && session.ended_at && onEdit;
  const isCompact = heightPx < BLOCK_COMPACT_HEIGHT_PX;
  const showText = !suppressLabel && !isCompact;

  const tooltip = isActive
    ? `実績 ${timeLabel}·${durationDisplay}分（計測中） — ${title}`
    : formatSessionTooltip(session, title);

  return (
    <div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? () => onEdit(session) : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(session);
              }
            }
          : undefined
      }
      className={`absolute right-2 left-12 overflow-hidden rounded-[var(--radius-sm)] border-l-[3px] text-sm ${
        canEdit ? "cursor-pointer transition-opacity hover:opacity-90" : ""
      } ${isActive ? "animate-pulse" : ""}`}
      style={{
        top: topPx,
        height: heightPx,
        zIndex: 5,
        borderColor: "var(--color-accent)",
        borderTopColor: "var(--color-accent-soft)",
        borderRightColor: "var(--color-accent-soft)",
        borderBottomColor: "var(--color-accent-soft)",
        background: "color-mix(in srgb, var(--color-accent) 22%, transparent)",
        fontFamily: "var(--font-body)",
      }}
      title={
        suppressLabel || isCompact
          ? tooltip
          : canEdit
            ? "クリックで開始・終了時刻を修正"
            : undefined
      }
      aria-label={suppressLabel || isCompact ? tooltip : undefined}
    >
      {showText && (
        <div className="flex h-full flex-col px-2 py-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            実績
          </span>
          <span
            className="block truncate text-xs tabular-nums"
            style={{ color: "var(--color-ink-muted)" }}
          >
            {timeLabel} · {durationDisplay}分
          </span>
          <span
            className="block truncate font-medium leading-tight"
            style={{ color: "var(--color-ink)" }}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
