"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { editSessionTimes } from "@/app/actions/sessions";
import { useToast } from "@/components/ui/Toast";
import {
  ACTUAL_LANE_CLASS,
  formatSessionTooltip,
  BLOCK_SHORT_LAYOUT_HEIGHT_PX,
  sessionDurationMinutes,
} from "@/lib/timeline-blocks";
import {
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
  datetimeFromMinutes,
  formatDateParam,
  formatTimeLabel,
  minutesFromDayStart,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  snapMinutes,
} from "@/lib/time";
import { getSessionDisplayTitle } from "@/lib/interrupt";
import type { WorkSession } from "@/lib/types";

type Props = {
  session: WorkSession;
  date: string;
  isActive: boolean;
  onEdit?: (session: WorkSession) => void;
  onUpdated: () => void;
};

type DocumentPointerListeners = {
  onMove: (ev: PointerEvent) => void;
  onUp: (ev: PointerEvent) => void;
  onCancel: (ev: PointerEvent) => void;
};

export function SessionBlock({
  session,
  date,
  isActive,
  onEdit,
  onUpdated,
}: Props) {
  const { showToast } = useToast();
  const blockRef = useRef<HTMLDivElement>(null);
  const pointerListenersRef = useRef<DocumentPointerListeners | null>(null);
  const dragMovedRef = useRef(false);
  const resizeStart = useRef({ y: 0, height: 0 });
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

  const detachPointerListeners = useCallback(() => {
    const listeners = pointerListenersRef.current;
    if (!listeners) return;
    document.removeEventListener("pointermove", listeners.onMove);
    document.removeEventListener("pointerup", listeners.onUp);
    document.removeEventListener("pointercancel", listeners.onCancel);
    pointerListenersRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      detachPointerListeners();
    };
  }, [detachPointerListeners]);

  const durationMin = isActive
    ? liveMinutes
    : sessionDurationMinutes(session);
  const sessionDate = formatDateParam(new Date(session.started_at));
  const topPx = minutesFromDayStart(session.started_at, sessionDate) * PX_PER_MINUTE;
  const heightPx = Math.max(durationMin * PX_PER_MINUTE, SNAP_MINUTES * PX_PER_MINUTE);
  const startDt = new Date(session.started_at);
  const timeLabel = formatTimeLabel(startDt.getHours(), startDt.getMinutes());
  const title = getSessionDisplayTitle(session);
  const durationDisplay = Math.round(durationMin);
  const canManipulate = !isActive && !!session.ended_at;
  const isShort = heightPx < BLOCK_SHORT_LAYOUT_HEIGHT_PX;

  const tooltip = isActive
    ? `実績 ${timeLabel}·${durationDisplay}分（計測中） — ${title}`
    : formatSessionTooltip(session, title);

  function handleMoveStart(e: React.PointerEvent) {
    if (!canManipulate || !session.ended_at) return;
    if ((e.target as HTMLElement).closest('[role="separator"]')) return;
    e.preventDefault();
    detachPointerListeners();
    dragMovedRef.current = false;

    const startY = e.clientY;
    const sessionDate = formatDateParam(new Date(session.started_at));
    const origStartMinutes = minutesFromDayStart(session.started_at, sessionDate);
    const durationMs =
      new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
    const maxStartMinutes =
      (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 - durationMin;

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - startY) > 3) dragMovedRef.current = true;
      const deltaY = ev.clientY - startY;
      const newMinutes = snapMinutes(origStartMinutes + deltaY / PX_PER_MINUTE);
      const clamped = Math.max(0, Math.min(newMinutes, maxStartMinutes));
      if (blockRef.current) {
        blockRef.current.style.top = `${clamped * PX_PER_MINUTE}px`;
      }
    };

    const onCancel = () => {
      if (blockRef.current) {
        blockRef.current.style.top = `${origStartMinutes * PX_PER_MINUTE}px`;
      }
      dragMovedRef.current = false;
      detachPointerListeners();
    };

    const onUp = async (ev: PointerEvent) => {
      detachPointerListeners();
      if (!dragMovedRef.current) return;

      const deltaY = ev.clientY - startY;
      const newMinutes = snapMinutes(origStartMinutes + deltaY / PX_PER_MINUTE);
      const clamped = Math.max(0, Math.min(newMinutes, maxStartMinutes));
      const newStart = datetimeFromMinutes(sessionDate, clamped);
      const newEnd = new Date(newStart.getTime() + durationMs);
      const result = await editSessionTimes(
        session.id,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
      if (!result.success) showToast(result.error);
      onUpdated();
    };

    pointerListenersRef.current = { onMove, onUp, onCancel };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
  }

  function handleResizeStart(e: React.PointerEvent) {
    if (!canManipulate || !session.ended_at) return;
    e.stopPropagation();
    e.preventDefault();
    detachPointerListeners();
    dragMovedRef.current = true;
    resizeStart.current = { y: e.clientY, height: heightPx };

    const sessionDate = formatDateParam(new Date(session.started_at));
    const startMinutes = minutesFromDayStart(session.started_at, sessionDate);
    const maxDurationMinutes =
      (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 - startMinutes;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - resizeStart.current.y;
      const newHeight = Math.max(
        SNAP_MINUTES * PX_PER_MINUTE,
        resizeStart.current.height + delta,
      );
      if (blockRef.current) {
        blockRef.current.style.height = `${newHeight}px`;
      }
    };

    const onCancel = () => {
      if (blockRef.current) {
        blockRef.current.style.height = `${resizeStart.current.height}px`;
      }
      dragMovedRef.current = false;
      detachPointerListeners();
    };

    const onUp = async (ev: PointerEvent) => {
      detachPointerListeners();
      const delta = ev.clientY - resizeStart.current.y;
      const newHeightPx = Math.max(
        SNAP_MINUTES * PX_PER_MINUTE,
        resizeStart.current.height + delta,
      );
      let newDurationMinutes = snapMinutes(newHeightPx / PX_PER_MINUTE);
      newDurationMinutes = Math.min(newDurationMinutes, maxDurationMinutes);
      const newStart = datetimeFromMinutes(sessionDate, startMinutes);
      const newEnd = new Date(newStart.getTime() + newDurationMinutes * 60_000);
      const result = await editSessionTimes(
        session.id,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
      if (!result.success) showToast(result.error);
      onUpdated();
    };

    pointerListenersRef.current = { onMove, onUp, onCancel };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
  }

  function handleClick() {
    if (!canManipulate || dragMovedRef.current || !onEdit) return;
    onEdit(session);
  }

  return (
    <div
      ref={blockRef}
      role={canManipulate && onEdit ? "button" : undefined}
      tabIndex={canManipulate && onEdit ? 0 : undefined}
      onPointerDown={canManipulate ? handleMoveStart : undefined}
      onClick={canManipulate ? handleClick : undefined}
      onKeyDown={
        canManipulate && onEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(session);
              }
            }
          : undefined
      }
      className={`${ACTUAL_LANE_CLASS} rounded-[var(--radius-sm)] border-l-[3px] text-sm ${
        canManipulate ? "cursor-grab active:cursor-grabbing" : ""
      } ${canManipulate && onEdit ? "transition-opacity hover:opacity-90" : ""} ${
        isActive ? "animate-pulse" : ""
      } ${isShort ? "overflow-x-hidden overflow-y-visible" : "overflow-hidden"}`}
      style={{
        top: topPx,
        height: heightPx,
        zIndex: 5,
        borderColor: "var(--color-actual)",
        borderTopColor: "var(--color-actual-soft)",
        borderRightColor: "var(--color-actual-soft)",
        borderBottomColor: "var(--color-actual-soft)",
        background: "color-mix(in srgb, var(--color-actual) 22%, transparent)",
        fontFamily: "var(--font-body)",
      }}
      title={
        isShort
          ? tooltip
          : canManipulate
            ? "ドラッグで移動 · 下端で長さ変更 · クリックで修正・削除"
            : undefined
      }
      aria-label={isShort ? tooltip : undefined}
    >
      {isShort ? (
        <div className="relative h-full min-h-0 w-full">
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center px-1.5 py-1">
            <span
              className="min-w-0 flex-1 truncate text-xs font-medium leading-none"
              style={{ color: "var(--color-ink)" }}
            >
              {title}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col px-2 py-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "var(--color-actual)" }}
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
      {canManipulate && (
        <div
          role="separator"
          aria-label="終了時刻をリサイズ"
          onPointerDown={handleResizeStart}
          className="absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize"
        />
      )}
    </div>
  );
}
