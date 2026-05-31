"use client";

import { useCallback, useEffect, useRef } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { moveTodoToUnplaced, updateTodoSchedule } from "@/app/actions/todos";
import { startSession } from "@/app/actions/sessions";
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  getSlotCount,
  getTimelineHeightPx,
  minutesFromDayStart,
  PX_PER_MINUTE,
  SNAP_MINUTES,
  formatTimeLabel,
  snapMinutes,
} from "@/lib/time";
import { getOverlappingIds } from "@/lib/overlap";
import {
  BLOCK_COMPACT_HEIGHT_PX,
  formatPlanTooltip,
  PLAN_LANE_CLASS,
} from "@/lib/timeline-blocks";
import type { Todo, WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { QuickAddModal } from "@/components/timeline/QuickAddModal";
import { SessionBlock } from "@/components/timeline/SessionBlock";

type Props = {
  date: string;
  placedTodos: Todo[];
  daySessions: WorkSession[];
  activeSessionId: string | null;
  activeSessionTodoId: string | null;
  onUpdated: () => void;
  onEditSession: (session: WorkSession) => void;
};

export function Timeline({
  date,
  placedTodos,
  daySessions,
  activeSessionId,
  activeSessionTodoId,
  onUpdated,
  onEditSession,
}: Props) {
  const { showToast } = useToast();
  const timelineRef = useRef<HTMLDivElement>(null);
  const overlappingIds = getOverlappingIds(placedTodos, date);

  const hours: number[] = [];
  for (let h = TIMELINE_START_HOUR; h < TIMELINE_END_HOUR; h++) {
    hours.push(h);
  }

  const slotCount = getSlotCount();
  const heightPx = getTimelineHeightPx();

  const handleBlockMoveStart = useCallback(
    (todo: Todo, e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[role="separator"]')) return;
      e.preventDefault();
      const startY = e.clientY;
      const origMinutes = minutesFromDayStart(todo.scheduled_start!, date);
      const el = (e.currentTarget as HTMLElement);

      const onMove = (ev: PointerEvent) => {
        const deltaY = ev.clientY - startY;
        const newMinutes = snapMinutes(
          origMinutes + deltaY / PX_PER_MINUTE,
        );
        const maxMinutes =
          (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 -
          todo.planned_minutes;
        const clamped = Math.max(0, Math.min(newMinutes, maxMinutes));
        el.style.top = `${clamped * PX_PER_MINUTE}px`;
      };

      const onUp = async (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        const deltaY = ev.clientY - startY;
        const newMinutes = snapMinutes(
          origMinutes + deltaY / PX_PER_MINUTE,
        );
        const maxMinutes =
          (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 -
          todo.planned_minutes;
        const clamped = Math.max(0, Math.min(newMinutes, maxMinutes));
        const result = await updateTodoSchedule(
          todo.id,
          date,
          clamped,
          todo.planned_minutes,
        );
        if (!result.success) showToast(result.error);
        onUpdated();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [date, onUpdated, showToast],
  );

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <h2
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          タイムライン
        </h2>
        <div className="flex items-center gap-4">
          <div
            className="hidden items-center gap-3 text-[10px] sm:flex"
            style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
          >
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-4 rounded-sm border border-dashed"
                style={{
                  borderColor: "var(--color-plan-border)",
                  background: "color-mix(in srgb, var(--color-plan) 18%, transparent)",
                }}
              />
              左=計画
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-4 rounded-sm border-l-[3px]"
                style={{
                  borderColor: "var(--color-actual)",
                  background: "color-mix(in srgb, var(--color-actual) 22%, transparent)",
                }}
              />
              右=実績
            </span>
          </div>
          <QuickAddModal date={date} onAdded={onUpdated} />
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto p-4">
        <div
          ref={timelineRef}
          className="relative mx-auto max-w-2xl"
          style={{ height: heightPx }}
        >
          {/* Hour labels + 15-min grid */}
          {hours.map((hour) => (
            <div key={hour}>
              {[0, 15, 30, 45].map((minute) => {
                const top =
                  (hour - TIMELINE_START_HOUR) * 60 * PX_PER_MINUTE +
                  minute * PX_PER_MINUTE;
                const isHour = minute === 0;
                return (
                  <div
                    key={`${hour}-${minute}`}
                    className="absolute right-0 left-0 flex items-start"
                    style={{ top }}
                  >
                    {isHour && (
                      <span
                        className="w-12 shrink-0 pr-2 text-right text-xs tabular-nums"
                        style={{
                          color: "var(--color-ink-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {formatTimeLabel(hour, 0)}
                      </span>
                    )}
                    {!isHour && <span className="w-12 shrink-0" />}
                    <div
                      className="flex-1 border-t"
                      style={{
                        borderColor: isHour
                          ? "var(--color-rule-strong)"
                          : "var(--color-rule)",
                        opacity: isHour ? 1 : 0.6,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Lane divider: plan (left) | actual (right) */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2"
            style={{ background: "var(--color-rule)", opacity: 0.5 }}
            aria-hidden="true"
          />

          {/* Drop slots for DnD (10-min) — plan lane only */}
          <div className="absolute top-0 left-12 right-[46%]">
            {Array.from({ length: slotCount }).map((_, i) => (
              <Droppable key={i} droppableId={`slot-${i}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      height: SNAP_MINUTES * PX_PER_MINUTE,
                      background: snapshot.isDraggingOver
                        ? "var(--color-plan-soft)"
                        : "transparent",
                    }}
                  >
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>

          {/* Session blocks (actual) — below plan blocks in z-order */}
          {daySessions.map((session) => (
            <SessionBlock
              key={session.id}
              session={session}
              date={date}
              isActive={session.id === activeSessionId}
              onEdit={onEditSession}
              onUpdated={onUpdated}
            />
          ))}

          {/* Placed todo blocks (plan) */}
          {placedTodos.map((todo) => {
            if (!todo.scheduled_start) return null;
            const topPx =
              minutesFromDayStart(todo.scheduled_start, date) * PX_PER_MINUTE;
            const heightPx = todo.planned_minutes * PX_PER_MINUTE;
            const isOverlapping = overlappingIds.has(todo.id);
            const isActive = activeSessionTodoId === todo.id;
            const title = todo.tasks?.title ?? "（無題）";
            const startDt = new Date(todo.scheduled_start);
            const timeLabel = formatTimeLabel(
              startDt.getHours(),
              startDt.getMinutes(),
            );

            return (
              <PlacedBlock
                key={todo.id}
                todo={todo}
                date={date}
                topPx={topPx}
                heightPx={heightPx}
                isOverlapping={isOverlapping}
                isActive={isActive}
                activeSessionTodoId={activeSessionTodoId}
                title={title}
                timeLabel={timeLabel}
                onMoveStart={handleBlockMoveStart}
                onUpdated={onUpdated}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

type BlockProps = {
  todo: Todo;
  date: string;
  topPx: number;
  heightPx: number;
  isOverlapping: boolean;
  isActive: boolean;
  activeSessionTodoId: string | null;
  title: string;
  timeLabel: string;
  onMoveStart: (todo: Todo, e: React.PointerEvent) => void;
  onUpdated: () => void;
};

type DocumentPointerListeners = {
  onMove: (ev: PointerEvent) => void;
  onUp: (ev: PointerEvent) => void;
  onCancel: (ev: PointerEvent) => void;
};

function PlacedBlock({
  todo,
  date,
  topPx,
  heightPx,
  isOverlapping,
  isActive,
  activeSessionTodoId,
  title,
  timeLabel,
  onMoveStart,
  onUpdated,
}: BlockProps) {
  const { showToast } = useToast();
  const resizeStart = useRef({ y: 0, height: 0 });
  const blockRef = useRef<HTMLDivElement>(null);
  const pointerListenersRef = useRef<DocumentPointerListeners | null>(null);

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

  async function handleStart() {
    const result = await startSession(todo.id);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("計測を開始しました", "success");
    onUpdated();
  }

  function handleResizeStart(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    detachPointerListeners();
    resizeStart.current = { y: e.clientY, height: heightPx };

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
      detachPointerListeners();
    };

    const onUp = async (ev: PointerEvent) => {
      detachPointerListeners();
      const delta = ev.clientY - resizeStart.current.y;
      const newHeightPx = Math.max(
        SNAP_MINUTES * PX_PER_MINUTE,
        resizeStart.current.height + delta,
      );
      const newMinutes = snapMinutes(newHeightPx / PX_PER_MINUTE);
      const startMinutes = minutesFromDayStart(todo.scheduled_start!, date);
      const result = await updateTodoSchedule(
        todo.id,
        date,
        startMinutes,
        newMinutes,
      );
      if (!result.success) showToast(result.error);
      onUpdated();
    };

    pointerListenersRef.current = { onMove, onUp, onCancel };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onCancel);
  }

  const isCompact = heightPx < BLOCK_COMPACT_HEIGHT_PX;
  const blockTooltip = isCompact
    ? formatPlanTooltip(timeLabel, todo.planned_minutes, title)
    : undefined;

  return (
    <div
      ref={blockRef}
      data-todo-block
      className={`${PLAN_LANE_CLASS} cursor-grab overflow-hidden rounded-[var(--radius-sm)] border border-dashed text-sm shadow-sm active:cursor-grabbing`}
      style={{
        top: topPx,
        height: heightPx,
        borderColor: isOverlapping
          ? "var(--color-warn-border)"
          : isActive
            ? "var(--color-plan)"
            : "var(--color-plan-border)",
        background: isOverlapping
          ? "color-mix(in srgb, var(--color-warn-soft) 75%, transparent)"
          : isActive
            ? "color-mix(in srgb, var(--color-plan-soft) 90%, transparent)"
            : "color-mix(in srgb, var(--color-plan) 16%, transparent)",
        zIndex: isActive ? 20 : 10,
        fontFamily: "var(--font-body)",
      }}
      title={blockTooltip}
      onPointerDown={(e) => onMoveStart(todo, e)}
    >
      <div className="flex h-full flex-col px-2 py-1.5">
        <div className="flex items-start justify-between gap-1">
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--color-plan)" }}
              >
                計画
              </span>
              <span
                className="block truncate text-xs tabular-nums"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {timeLabel} · {todo.planned_minutes}分
              </span>
              <span
                className="block truncate font-medium leading-tight"
                style={{ color: "var(--color-ink)" }}
              >
                {title}
              </span>
            </div>
          )}
          <div className={`flex shrink-0 gap-0.5${isCompact ? " ml-auto" : ""}`}>
            {activeSessionTodoId !== todo.id && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStart();
                }}
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  background: "var(--color-plan)",
                  color: "var(--color-accent-ink)",
                }}
                title="計測開始"
              >
                ▶
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation();
                const res = await moveTodoToUnplaced(todo.id);
                if (!res.success) showToast(res.error);
                else onUpdated();
              }}
              className="rounded px-1 py-0.5 text-xs"
              style={{ color: "var(--color-ink-muted)" }}
              title="未配置へ戻す"
            >
              外す
            </button>
          </div>
        </div>
        {!isCompact && isOverlapping && (
          <span className="mt-auto text-xs" style={{ color: "var(--color-warn)" }}>
            重なり
          </span>
        )}
      </div>
      <div
        role="separator"
        aria-label="リサイズ"
        onPointerDown={handleResizeStart}
        className="absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize"
      />
    </div>
  );
}
