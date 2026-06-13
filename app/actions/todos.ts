"use server";

import { revalidatePath } from "next/cache";
import { findOverlappingTodo } from "@/lib/overlap";
import {
  datetimeFromMinutes,
  formatDateParam,
  snapMinutes,
  SNAP_MINUTES,
} from "@/lib/time";
import { parseTodoRows, TODO_WITH_TASK_SELECT } from "@/lib/todos";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Todo } from "@/lib/types";

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");
  return { supabase, user };
}

async function fetchPlacedTodosForDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  date: string,
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select(TODO_WITH_TASK_SELECT)
    .eq("user_id", userId)
    .eq("date", date)
    .not("scheduled_start", "is", null)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return parseTodoRows(data);
}

export async function updateTodoSchedule(
  todoId: string,
  date: string,
  startMinutes: number | null,
  plannedMinutes: number,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const snappedMinutes =
      startMinutes === null ? null : snapMinutes(startMinutes);
    const clampedMinutes = Math.max(SNAP_MINUTES, snapMinutes(plannedMinutes));

    let scheduledStart: string | null = null;
    if (snappedMinutes !== null) {
      scheduledStart = datetimeFromMinutes(date, snappedMinutes).toISOString();
    }

    if (scheduledStart) {
      const placed = await fetchPlacedTodosForDate(supabase, user.id, date);
      const overlap = findOverlappingTodo(
        {
          id: todoId,
          scheduled_start: scheduledStart,
          planned_minutes: clampedMinutes,
        },
        placed,
        date,
      );
      if (overlap) {
        return {
          success: false,
          error: `「${overlap.tasks?.title ?? "Todo"}」と時間が重なります。別の時間帯を選んでください。`,
        };
      }
    }

    const { data: existing, error: fetchError } = await supabase
      .from("todos")
      .select("status")
      .eq("id", todoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: "Todo が見つかりません" };
    if (existing.status === "rolled_over") {
      return { success: false, error: "繰越済みの Todo は変更できません" };
    }

    const { error } = await supabase
      .from("todos")
      .update({
        scheduled_start: scheduledStart,
        planned_minutes: clampedMinutes,
      })
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "更新に失敗しました",
    };
  }
}

export async function deleteTodo(todoId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: existing, error: fetchError } = await supabase
      .from("todos")
      .select("status")
      .eq("id", todoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) return { success: false, error: fetchError.message };
    if (!existing) return { success: false, error: "Todo が見つかりません" };
    if (existing.status === "rolled_over") {
      return { success: false, error: "繰越済みの Todo は削除できません" };
    }

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "削除に失敗しました",
    };
  }
}

export async function getTodosForDate(date: string): Promise<Todo[]> {
  const { supabase, user } = await getAuthedUser();

  const { data, error } = await supabase
    .from("todos")
    .select(TODO_WITH_TASK_SELECT)
    .eq("user_id", user.id)
    .eq("date", date)
    .in("status", ["pending", "done", "rolled_over"])
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return parseTodoRows(data);
}

export async function getPlacedTodosForDate(date: string) {
  const todos = await getTodosForDate(date);
  return todos.filter((t) => t.scheduled_start && t.status === "pending");
}

export { formatDateParam };
