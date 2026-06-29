"use client";

import { useCallback, useEffect, useRef } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { updateTodoSchedule, deleteTodo } from "@/app/actions/todos";
import { startSession } from "@/app/actions/sessions";
import {
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  datetimeFromMinutes,
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
  BLOCK_SHORT_LAYOUT_HEIGHT_PX,
  formatPlanTooltip,
  PLAN_LANE_CLASS,
} from "@/lib/timeline-blocks";
import type { Todo, WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { QuickAddModal } from "@/components/timeline/QuickAddModal";
import { SessionBlock } from "@/components/timeline/SessionBlock";
import {
  buildTimelineCsv,
  downloadTimelineCsv,
  hasTimelineExportData,
} from "@/lib/timeline-csv";

type Props = {
  date: string;
  placedTodos: Todo[];
  daySessions: WorkSession[];
  activeSessionId: string | null;
  activeSessionTodoId: string | null;
  onUpdated: () => void;
  onEditSession: (session: WorkSession) => void;
  onEditTodo?: (todo: Todo) => void;
  onOptimisticUpdate?: (todoId: string, scheduled_start: string | null, planned_minutes: number) => void;
};

export function Timeline({
  date,
  placedTodos,
  daySessions,
  activeSessionId,
  activeSessionTodoId,
  onUpdated,
  onEditSession,
  onEditTodo,
  onOptimisticUpdate,
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

  const handleExportCsv = useCallback(() => {
    if (!hasTimelineExportData(placedTodos, daySessions)) {
      showToast("エクスポートするデータがありません");
      return;
    }
    const csv = buildTimelineCsv(date, placedTodos, daySessions);
    downloadTimelineCsv(csv, date);
    showToast("CSVをダウンロードしました", "success");
  }, [date, daySessions, placedTodos, showToast]);

  const handleBlockMoveStart = useCallback(
    (todo: Todo, e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('[role="separator"]')) return;
      e.preventDefault();
      const startY = e.clientY;
      const origMinutes = minutesFromDayStart(todo.scheduled_start!, date);
      const el = (e.currentTarget as HTMLElement);
      let hasDragged = false;

      const onMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientY - startY) > 3) hasDragged = true;
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
        if (!hasDragged) {
          onEditTodo?.(todo);
          return;
        }
        const deltaY = ev.clientY - startY;
        const newMinutes = snapMinutes(
          origMinutes + deltaY / PX_PER_MINUTE,
        );
        const maxMinutes =
          (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60 -
          todo.planned_minutes;
        const clamped = Math.max(0, Math.min(newMinutes, maxMinutes));
        const scheduledStartIso = datetimeFromMinutes(date, clamped).toISOString();
        // 即時 UI 更新（サーバー応答を待たない）
        onOptimisticUpdate?.(todo.id, scheduledStartIso, todo.planned_minutes);
        const result = await updateTodoSchedule(
          todo.id,
          date,
          scheduledStartIso,
          todo.planned_minutes,
        );
        if (!result.success) showToast(result.error);
        onUpdated();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [date, onEditTodo, onOptimisticUpdate, onUpdated, showToast],
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
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
            }}
            title="タイムラインの計画・実績をCSVでダウンロード"
          >
            CSV
          </button>
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
            const isRolledOver = todo.status === "rolled_over";
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
                isRolledOver={isRolledOver}
                activeSessionTodoId={activeSessionTodoId}
                title={title}
                timeLabel={timeLabel}
                onMoveStart={handleBlockMoveStart}
                onUpdated={onUpdated}
                onOptimisticUpdate={onOptimisticUpdate}
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
  isRolledOver: boolean;
  activeSessionTodoId: string | null;
  title: string;
  timeLabel: string;
  onMoveStart: (todo: Todo, e: React.PointerEvent) => void;
  onUpdated: () => void;
  onOptimisticUpdate?: (todoId: string, scheduled_start: string | null, planned_minutes: number) => void;
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
  isRolledOver,
  activeSessionTodoId,
  title,
  timeLabel,
  onMoveStart,
  onUpdated,
  onOptimisticUpdate,
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
      // 即時 UI 更新（サーバー応答を待たない）
      onOptimisticUpdate?.(todo.id, todo.scheduled_start!, newMinutes);
      const result = await updateTodoSchedule(
        todo.id,
        date,
        todo.scheduled_start!,
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

  const isShort = heightPx < BLOCK_SHORT_LAYOUT_HEIGHT_PX;
  const blockTooltip = isShort
    ? formatPlanTooltip(timeLabel, todo.planned_minutes, title)
    : isRolledOver
      ? `繰越済 ${timeLabel}·${todo.planned_minutes}分 — ${title}`
      : undefined;

  return (
    <div
      ref={blockRef}
      data-todo-block
      className={`${PLAN_LANE_CLASS} rounded-[var(--radius-sm)] border border-dashed text-sm ${
        isRolledOver ? "" : "cursor-grab shadow-sm active:cursor-grabbing"
      } ${isShort ? "overflow-x-hidden overflow-y-visible" : "overflow-hidden"}`}
      style={{
        top: topPx,
        height: heightPx,
        borderColor: isRolledOver
          ? "var(--color-plan-border)"
          : isOverlapping
            ? "var(--color-warn-border)"
            : isActive
              ? "var(--color-plan)"
              : "var(--color-plan-border)",
        background: isRolledOver
          ? "color-mix(in srgb, var(--color-plan) 8%, transparent)"
          : isOverlapping
            ? "color-mix(in srgb, var(--color-warn-soft) 75%, transparent)"
            : isActive
              ? "color-mix(in srgb, var(--color-plan-soft) 90%, transparent)"
              : "color-mix(in srgb, var(--color-plan) 16%, transparent)",
        opacity: isRolledOver ? 0.55 : 1,
        zIndex: isActive ? 20 : isRolledOver ? 8 : 10,
        fontFamily: "var(--font-body)",
      }}
      title={blockTooltip}
      onPointerDown={isRolledOver ? undefined : (e) => onMoveStart(todo, e)}
    >
      {isShort ? (
        <div className="relative h-full min-h-0 w-full">
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-1 px-1.5 py-1">
            <span
              className="min-w-0 flex-1 truncate text-xs font-medium leading-none"
              style={{ color: isRolledOver ? "var(--color-ink-muted)" : "var(--color-ink)" }}
            >
              {title}
            </span>
            {!isRolledOver && (
              <div className="flex shrink-0 gap-0.5">
                {activeSessionTodoId !== todo.id && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStart();
                    }}
                    className="rounded px-1 py-0.5 text-xs font-medium leading-none cursor-pointer"
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
                    if (!window.confirm("この計画を削除しますか？")) return;
                    const res = await deleteTodo(todo.id);
                    if (!res.success) showToast(res.error);
                    else onUpdated();
                  }}
                  className="rounded px-1 py-0.5 text-xs leading-none"
                  style={{ color: "var(--color-ink-muted)" }}
                  title="計画を削除"
                >
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="flex h-full flex-col px-2 py-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: "var(--color-plan)" }}
            >
              {isRolledOver ? "繰越済" : "計画"}
            </span>
            <span
              className="block truncate text-xs tabular-nums"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {timeLabel} · {todo.planned_minutes}分
            </span>
            <span
              className="block truncate font-medium leading-tight"
              style={{ color: isRolledOver ? "var(--color-ink-muted)" : "var(--color-ink)" }}
            >
              {title}
            </span>
          </div>
          {!isRolledOver && (
            <div className="flex shrink-0 gap-0.5">
              {activeSessionTodoId !== todo.id && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart();
                  }}
                  className="rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer"
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
                  if (!window.confirm("この計画を削除しますか？")) return;
                  const res = await deleteTodo(todo.id);
                  if (!res.success) showToast(res.error);
                  else onUpdated();
                }}
                className="rounded px-1 py-0.5 text-xs"
                style={{ color: "var(--color-ink-muted)" }}
                title="計画を削除"
              >
                削除
              </button>
            </div>
          )}
        </div>
        {isOverlapping && !isRolledOver && (
          <span className="mt-auto text-xs" style={{ color: "var(--color-warn)" }}>
            重なり
          </span>
        )}
      </div>
      )}
      {!isRolledOver && (
        <div
          role="separator"
          aria-label="リサイズ"
          onPointerDown={handleResizeStart}
          className="absolute right-0 bottom-0 left-0 h-2 cursor-ns-resize"
        />
      )}
    </div>
  );
}
