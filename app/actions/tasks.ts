"use server";

import { revalidatePath } from "next/cache";
import { findOverlappingTodo } from "@/lib/overlap";
import {
  datetimeFromMinutes,
  snapMinutes,
  SNAP_MINUTES,
} from "@/lib/time";
import { INBOX_PROJECT_NAME, parseTodoRows, TODO_WITH_TASK_SELECT } from "@/lib/todos";
import { parseBacklogTasks, TASK_SELECT } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, BacklogStatus, BacklogTask } from "@/lib/types";

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");
  return { supabase, user };
}

export async function getBacklogTasks(): Promise<BacklogTask[]> {
  const { supabase, user } = await getAuthedUser();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", user.id)
    .order("title");

  if (error) throw new Error(error.message);
  return parseBacklogTasks(data);
}

async function getInboxProjectId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("is_system", true)
    .eq("title", INBOX_PROJECT_NAME)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createTask(input: {
  title: string;
  projectId?: string | null;
  parentId?: string | null;
  estimateMinutes?: number | null;
  dueDate?: string | null;
  description?: string | null;
  priority?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const trimmed = input.title.trim();
    if (!trimmed) return { success: false, error: "タイトルを入力してください" };

    const { supabase, user } = await getAuthedUser();

    if (input.parentId) {
      const { data: parent } = await supabase
        .from("tasks")
        .select("id, parent_id, project_id")
        .eq("id", input.parentId)
        .eq("user_id", user.id)
        .single();

      if (!parent) {
        return { success: false, error: "親タスクが見つかりません" };
      }

      if (parent.parent_id) {
        return {
          success: false,
          error: "親子は2段までです（親の下に子のみ作成可能）",
        };
      }

      await supabase
        .from("tasks")
        .update({ is_leaf: false })
        .eq("id", input.parentId)
        .eq("user_id", user.id);
    }

    let projectId = input.projectId ?? null;
    if (input.parentId) {
      const { data: parent } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("id", input.parentId)
        .eq("user_id", user.id)
        .single();
      projectId = parent?.project_id ?? projectId;
    } else if (projectId === null) {
      projectId = await getInboxProjectId(supabase, user.id);
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: trimmed,
        project_id: projectId,
        parent_id: input.parentId ?? null,
        status: "not_started",
        is_leaf: true,
        estimate_minutes: input.estimateMinutes ?? null,
        due_date: input.dueDate ?? null,
        description: input.description?.trim() || null,
        priority: input.priority ?? 0,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message ?? "作成に失敗しました" };
    }

    revalidatePath("/");
    return { success: true, data: { id: data.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "作成に失敗しました",
    };
  }
}

export async function updateTask(
  taskId: string,
  fields: {
    title?: string;
    status?: BacklogStatus;
    description?: string | null;
    estimateMinutes?: number | null;
    dueDate?: string | null;
    projectId?: string | null;
    priority?: number;
  },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: existing } = await supabase
      .from("tasks")
      .select("id, is_leaf, parent_id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return { success: false, error: "タスクが見つかりません" };
    }

    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) {
      const trimmed = fields.title.trim();
      if (!trimmed) return { success: false, error: "タイトルを入力してください" };
      updates.title = trimmed;
    }
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.estimateMinutes !== undefined) {
      updates.estimate_minutes = fields.estimateMinutes;
    }
    if (fields.dueDate !== undefined) updates.due_date = fields.dueDate;
    if (fields.priority !== undefined) updates.priority = fields.priority;

    if (fields.projectId !== undefined) {
      if (existing.parent_id) {
        return {
          success: false,
          error: "子タスクのプロジェクトは親と連動します。親タスクを付け替えてください",
        };
      }
      updates.project_id = fields.projectId;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    if (fields.projectId !== undefined && !existing.parent_id) {
      await supabase
        .from("tasks")
        .update({ project_id: fields.projectId })
        .eq("parent_id", taskId)
        .eq("user_id", user.id);
    }

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "更新に失敗しました",
    };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: existing } = await supabase
      .from("tasks")
      .select("id, parent_id, is_leaf")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return { success: false, error: "タスクが見つかりません" };
    }

    if (!existing.is_leaf) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", taskId)
        .eq("user_id", user.id);

      if (count && count > 0) {
        return {
          success: false,
          error: "子タスクがある親タスクは削除できません",
        };
      }
    }

    const parentId = existing.parent_id;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    if (parentId) {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", parentId)
        .eq("user_id", user.id);

      if (!count || count === 0) {
        await supabase
          .from("tasks")
          .update({ is_leaf: true })
          .eq("id", parentId)
          .eq("user_id", user.id);
      }
    }

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "削除に失敗しました",
    };
  }
}

export async function scheduleBacklogTask(
  taskId: string,
  date: string,
  startMinutes: number,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: task } = await supabase
      .from("tasks")
      .select("id, is_leaf, estimate_minutes")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) return { success: false, error: "タスクが見つかりません" };
    if (!task.is_leaf) {
      return { success: false, error: "親タスクは Todo に配置できません" };
    }

    const plannedMinutes = Math.max(
      SNAP_MINUTES,
      snapMinutes(task.estimate_minutes ?? 30),
    );
    const snappedStart = snapMinutes(startMinutes);
    const scheduledStart = datetimeFromMinutes(date, snappedStart).toISOString();

    const { data: placedRaw } = await supabase
      .from("todos")
      .select(TODO_WITH_TASK_SELECT)
      .eq("user_id", user.id)
      .eq("date", date)
      .not("scheduled_start", "is", null)
      .eq("status", "pending");

    const placed = parseTodoRows(placedRaw);
    const overlap = findOverlappingTodo(
      {
        id: "new",
        scheduled_start: scheduledStart,
        planned_minutes: plannedMinutes,
      },
      placed,
      date,
    );

    if (overlap) {
      return {
        success: false,
        error: `「${overlap.tasks?.title ?? "Todo"}」と時間が重なります`,
      };
    }

    const { error } = await supabase.from("todos").insert({
      user_id: user.id,
      task_id: taskId,
      date,
      scheduled_start: scheduledStart,
      planned_minutes: plannedMinutes,
      status: "pending",
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "配置に失敗しました",
    };
  }
}

export async function addUnplacedTodoFromBacklog(
  taskId: string,
  date: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: task } = await supabase
      .from("tasks")
      .select("id, is_leaf, estimate_minutes")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) return { success: false, error: "タスクが見つかりません" };
    if (!task.is_leaf) {
      return { success: false, error: "親タスクは Todo に配置できません" };
    }

    const plannedMinutes = task.estimate_minutes ?? 30;

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
