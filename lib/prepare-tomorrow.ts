import { todosOverlap } from "@/lib/overlap";
import {
  datetimeFromMinutes,
  minutesFromDayStart,
  SNAP_MINUTES,
  TIMELINE_END_HOUR,
  TIMELINE_START_HOUR,
} from "@/lib/time";

export type MinuteBlock = {
  startMinutes: number;
  durationMinutes: number;
};

export type CarryOverSourceTodo = {
  id: string;
  taskId: string;
  plannedMinutes: number;
  title: string;
};

export type CarryOverInput = {
  /** Representative todo for `rolled_from_todo_id` */
  todoId: string;
  taskId: string;
  plannedMinutes: number;
  title: string;
  sourceTodoIds: string[];
};

export type CarryOverPlacement = {
  todoId: string;
  taskId: string;
  plannedMinutes: number;
  scheduledStartMinutes: number;
  sourceTodoIds: string[];
};

export type PlacementPlan = {
  placements: CarryOverPlacement[];
  overflow: { todoId: string; title: string }[];
};

/**
 * Parses a work-day start time relative to {@link TIMELINE_START_HOUR}.
 * Accepted formats: `"H:MM"` or `"HH:MM"` (24-hour). Examples: `"9:00"`, `"09:00"`.
 * If the minutes segment is empty (e.g. `"9:"`), minutes default to `0`.
 * @throws {Error} when the input is not a valid time string
 */
export function workDayStartMinutes(workDayStart: string): number {
  const trimmed = workDayStart.trim();
  if (!trimmed.includes(":")) {
    throw new Error(
      `Invalid work day start "${workDayStart}": expected "H:MM" or "HH:MM"`,
    );
  }

  const [hourPart, minutePart = "0"] = trimmed.split(":");
  const hours = Number(hourPart);
  const minutes = minutePart === "" ? 0 : Number(minutePart);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(
      `Invalid work day start "${workDayStart}": hours and minutes must be numbers`,
    );
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(
      `Invalid work day start "${workDayStart}": out of range (use 0–23:0–59)`,
    );
  }

  return (hours - TIMELINE_START_HOUR) * 60 + minutes;
}

export function getTimelineMaxMinutes(): number {
  return (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
}

export function blocksOverlap(a: MinuteBlock, b: MinuteBlock): boolean {
  const aEnd = a.startMinutes + a.durationMinutes;
  const bEnd = b.startMinutes + b.durationMinutes;
  return a.startMinutes < bEnd && b.startMinutes < aEnd;
}

function blockFromScheduled(
  scheduledStart: string,
  plannedMinutes: number,
  dateStr: string,
): MinuteBlock {
  return {
    startMinutes: minutesFromDayStart(scheduledStart, dateStr),
    durationMinutes: plannedMinutes,
  };
}

/** Merges multiple same-task todos into one carry-over item (sums planned minutes). */
export function mergeCarryOverByTask(
  todos: CarryOverSourceTodo[],
): CarryOverInput[] {
  const order: string[] = [];
  const byTask = new Map<string, CarryOverSourceTodo[]>();

  for (const todo of todos) {
    if (!byTask.has(todo.taskId)) {
      order.push(todo.taskId);
    }
    const group = byTask.get(todo.taskId) ?? [];
    group.push(todo);
    byTask.set(todo.taskId, group);
  }

  return order.map((taskId) => {
    const group = byTask.get(taskId)!;
    const plannedMinutes = group.reduce((sum, t) => sum + t.plannedMinutes, 0);
    return {
      todoId: group[0].id,
      taskId,
      plannedMinutes,
      title: group[0].title,
      sourceTodoIds: group.map((t) => t.id),
    };
  });
}

export function existingBlocksFromTodos(
  todos: { scheduled_start: string; planned_minutes: number }[],
  dateStr: string,
): MinuteBlock[] {
  return todos.map((t) =>
    blockFromScheduled(t.scheduled_start, t.planned_minutes, dateStr),
  );
}

export function planCarryOverPlacements(
  items: CarryOverInput[],
  existingBlocks: MinuteBlock[],
  workStartMinutes: number,
  maxEndMinutes = getTimelineMaxMinutes(),
  snapMinutes = SNAP_MINUTES,
): PlacementPlan {
  const occupied = [...existingBlocks];
  const placements: CarryOverPlacement[] = [];
  const overflow: { todoId: string; title: string }[] = [];

  for (const item of items) {
    const duration = Math.max(snapMinutes, item.plannedMinutes);
    let placed: CarryOverPlacement | null = null;

    for (
      let start = workStartMinutes;
      start + duration <= maxEndMinutes;
      start += snapMinutes
    ) {
      const candidate: MinuteBlock = { startMinutes: start, durationMinutes: duration };
      const overlaps = occupied.some((block) => blocksOverlap(candidate, block));
      if (!overlaps) {
        placed = {
          todoId: item.todoId,
          taskId: item.taskId,
          plannedMinutes: duration,
          scheduledStartMinutes: start,
          sourceTodoIds: item.sourceTodoIds,
        };
        occupied.push(candidate);
        break;
      }
    }

    if (placed) {
      placements.push(placed);
    } else {
      overflow.push({ todoId: item.todoId, title: item.title });
    }
  }

  return { placements, overflow };
}

/** Validates placement against ISO-scheduled blocks using overlap.ts */
export function validatePlacementsOnDate(
  placements: CarryOverPlacement[],
  existing: { scheduled_start: string; planned_minutes: number }[],
  dateStr: string,
): boolean {
  const all = [
    ...existing.map((t) => ({
      id: "existing",
      scheduled_start: t.scheduled_start,
      planned_minutes: t.planned_minutes,
    })),
  ];

  for (const p of placements) {
    const iso = datetimeFromMinutes(dateStr, p.scheduledStartMinutes).toISOString();
    const candidate = {
      id: p.todoId,
      scheduled_start: iso,
      planned_minutes: p.plannedMinutes,
    };
    for (const other of all) {
      if (
        todosOverlap(
          { scheduled_start: candidate.scheduled_start, planned_minutes: candidate.planned_minutes },
          { scheduled_start: other.scheduled_start, planned_minutes: other.planned_minutes },
          dateStr,
        )
      ) {
        return false;
      }
    }
    all.push(candidate);
  }

  return true;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, "0");
  const nd = String(next.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}
