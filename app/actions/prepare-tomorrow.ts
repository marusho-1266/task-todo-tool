"use server";

import { revalidatePath } from "next/cache";
import {
  addDaysToDateStr,
  existingBlocksFromTodos,
  planCarryOverPlacements,
  type CarryOverInput,
  workDayStartMinutes,
} from "@/lib/prepare-tomorrow";
import { datetimeFromMinutes } from "@/lib/time";
import { parseTodoRows, TODO_WITH_TASK_SELECT } from "@/lib/todos";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Todo } from "@/lib/types";

const DEFAULT_WORK_DAY_START = "09:00";

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");
  return { supabase, user };
}

export async function getCarryOverCandidates(
  dateStr: string,
): Promise<Todo[]> {
  const { supabase, user } = await getAuthedUser();

  const { data, error } = await supabase
    .from("todos")
    .select(TODO_WITH_TASK_SELECT)
    .eq("user_id", user.id)
    .eq("date", dateStr)
    .eq("status", "pending")
    .order("scheduled_start", { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return parseTodoRows(data);
}

export async function prepareTomorrow(
  todayDateStr: string,
  selectedTodoIds: string[],
): Promise<
  ActionResult<{
    tomorrowDate: string;
    placedCount: number;
    overflowTitles: string[];
  }>
> {
  try {
    if (selectedTodoIds.length === 0) {
      return { success: false, error: "繰越する Todo を1件以上選択してください" };
    }

    const { supabase, user } = await getAuthedUser();
    const tomorrowDate = addDaysToDateStr(todayDateStr, 1);

    const { data: profile } = await supabase
      .from("profiles")
      .select("work_day_start")
      .eq("user_id", user.id)
      .maybeSingle();

    const workStart = profile?.work_day_start ?? DEFAULT_WORK_DAY_START;
    const workStartMinutes = workDayStartMinutes(workStart);

    const { data: todayTodosRaw, error: todayError } = await supabase
      .from("todos")
      .select(TODO_WITH_TASK_SELECT)
      .eq("user_id", user.id)
      .eq("date", todayDateStr)
      .eq("status", "pending")
      .in("id", selectedTodoIds);

    if (todayError) {
      return { success: false, error: todayError.message };
    }

    const todayTodos = parseTodoRows(todayTodosRaw);
    if (todayTodos.length !== selectedTodoIds.length) {
      return {
        success: false,
        error: "選択した Todo の一部が見つかりません",
      };
    }

    const { data: tomorrowPlacedRaw, error: tomorrowError } = await supabase
      .from("todos")
      .select("scheduled_start, planned_minutes")
      .eq("user_id", user.id)
      .eq("date", tomorrowDate)
      .eq("status", "pending")
      .not("scheduled_start", "is", null);

    if (tomorrowError) {
      return { success: false, error: tomorrowError.message };
    }

    const existingBlocks = existingBlocksFromTodos(
      (tomorrowPlacedRaw ?? []).map((t) => ({
        scheduled_start: t.scheduled_start as string,
        planned_minutes: t.planned_minutes,
      })),
      tomorrowDate,
    );

    const carryItems: CarryOverInput[] = todayTodos.map((t) => ({
      todoId: t.id,
      taskId: t.task_id,
      plannedMinutes: t.planned_minutes,
      title: t.tasks?.title ?? "（無題）",
    }));

    const plan = planCarryOverPlacements(
      carryItems,
      existingBlocks,
      workStartMinutes,
    );

    const insertedTodoIds: string[] = [];
    const rolledOverTodoIds: string[] = [];

    try {
      for (const placement of plan.placements) {
        const scheduledStart = datetimeFromMinutes(
          tomorrowDate,
          placement.scheduledStartMinutes,
        ).toISOString();

        const { data: inserted, error: insertError } = await supabase
          .from("todos")
          .insert({
            user_id: user.id,
            task_id: placement.taskId,
            date: tomorrowDate,
            scheduled_start: scheduledStart,
            planned_minutes: placement.plannedMinutes,
            status: "pending",
            rolled_from_todo_id: placement.todoId,
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          throw new Error(insertError?.message ?? "繰越 Todo の作成に失敗しました");
        }

        insertedTodoIds.push(inserted.id);

        const { error: updateError } = await supabase
          .from("todos")
          .update({ status: "rolled_over" })
          .eq("id", placement.todoId)
          .eq("user_id", user.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        rolledOverTodoIds.push(placement.todoId);
      }
    } catch (placementError) {
      if (insertedTodoIds.length > 0) {
        await supabase
          .from("todos")
          .delete()
          .in("id", insertedTodoIds)
          .eq("user_id", user.id);
      }
      if (rolledOverTodoIds.length > 0) {
        await supabase
          .from("todos")
          .update({ status: "pending" })
          .in("id", rolledOverTodoIds)
          .eq("user_id", user.id);
      }

      return {
        success: false,
        error:
          placementError instanceof Error
            ? placementError.message
            : "繰越の反映に失敗しました",
      };
    }

    revalidatePath("/");
    return {
      success: true,
      data: {
        tomorrowDate,
        placedCount: plan.placements.length,
        overflowTitles: plan.overflow.map((o) => o.title),
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "明日を準備に失敗しました",
    };
  }
}
