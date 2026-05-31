"use server";

import { revalidatePath } from "next/cache";
import { findOverlappingTodo } from "@/lib/overlap";
import {
  datetimeFromMinutes,
  formatDateParam,
  snapMinutes,
  SNAP_MINUTES,
} from "@/lib/time";
import { parseTodoRows, TODO_WITH_TASK_SELECT, INBOX_PROJECT_NAME, QUICK_ADD_PLANNED_MINUTES } from "@/lib/todos";
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

export async function moveTodoToUnplaced(
  todoId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { error } = await supabase
      .from("todos")
      .update({ scheduled_start: null })
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

export async function quickAddTodo(
  title: string,
  date: string,
): Promise<ActionResult<{ todoId: string }>> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "タイトルを入力してください" };

    const { supabase, user } = await getAuthedUser();

    const { data: inbox } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_system", true)
      .eq("title", INBOX_PROJECT_NAME)
      .maybeSingle();

    if (!inbox) {
      return {
        success: false,
        error: `${INBOX_PROJECT_NAME} プロジェクトが見つかりません`,
      };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        project_id: inbox.id,
        title: trimmed,
        status: "not_started",
        is_leaf: true,
      })
      .select("id")
      .single();

    if (taskError || !task) {
      return { success: false, error: taskError?.message ?? "タスク作成失敗" };
    }

    const { data: todo, error: todoError } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        task_id: task.id,
        date,
        planned_minutes: QUICK_ADD_PLANNED_MINUTES,
        status: "pending",
      })
      .select("id")
      .single();

    if (todoError || !todo) {
      await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .eq("user_id", user.id);
      return { success: false, error: todoError?.message ?? "Todo 作成失敗" };
    }

    revalidatePath("/");
    return { success: true, data: { todoId: todo.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "追加に失敗しました",
    };
  }
}

export async function addUnplacedTodo(
  taskId: string,
  date: string,
  plannedMinutes = 30,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { error } = await supabase.from("todos").insert({
      user_id: user.id,
      task_id: taskId,
      date,
      planned_minutes: plannedMinutes,
      status: "pending",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "追加に失敗しました",
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
    .in("status", ["pending", "done"])
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return parseTodoRows(data);
}

export async function getPlacedTodosForDate(date: string) {
  const todos = await getTodosForDate(date);
  return todos.filter((t) => t.scheduled_start && t.status === "pending");
}

export { formatDateParam };
