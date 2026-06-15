import type { Todo } from "@/lib/types";

export function todosOverlap(
  a: { scheduled_start: string; planned_minutes: number },
  b: { scheduled_start: string; planned_minutes: number },
): boolean {
  const aStart = new Date(a.scheduled_start).getTime();
  const aEnd = aStart + a.planned_minutes * 60_000;
  const bStart = new Date(b.scheduled_start).getTime();
  const bEnd = bStart + b.planned_minutes * 60_000;
  return aStart < bEnd && bStart < aEnd;
}

export function findOverlappingTodo(
  candidate: { id: string; scheduled_start: string; planned_minutes: number },
  todos: Todo[],
  _dateStr?: string,
): Todo | null {
  for (const todo of todos) {
    if (todo.id === candidate.id) continue;
    if (!todo.scheduled_start || todo.status !== "pending") continue;
    if (
      todosOverlap(
        { scheduled_start: candidate.scheduled_start, planned_minutes: candidate.planned_minutes },
        { scheduled_start: todo.scheduled_start, planned_minutes: todo.planned_minutes },
      )
    ) {
      return todo;
    }
  }
  return null;
}

export function getOverlappingIds(todos: Todo[], _dateStr?: string): Set<string> {
  const placed = todos.filter(
    (t) => t.scheduled_start && t.status === "pending",
  );
  const overlapping = new Set<string>();

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (
        todosOverlap(
          {
            scheduled_start: placed[i].scheduled_start!,
            planned_minutes: placed[i].planned_minutes,
          },
          {
            scheduled_start: placed[j].scheduled_start!,
            planned_minutes: placed[j].planned_minutes,
          },
        )
      ) {
        overlapping.add(placed[i].id);
        overlapping.add(placed[j].id);
      }
    }
  }

  return overlapping;
}
