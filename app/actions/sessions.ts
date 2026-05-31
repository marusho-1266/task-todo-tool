"use server";

import { revalidatePath } from "next/cache";
import { durationMinutesBetween } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");
  return { supabase, user };
}

export async function recalculateActualMinutes(taskId: string): Promise<void> {
  const { supabase, user } = await getAuthedUser();

  const { data: sessions } = await supabase
    .from("work_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .eq("task_id", taskId)
    .not("duration_minutes", "is", null);

  const total = (sessions ?? []).reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0),
    0,
  );

  await supabase
    .from("tasks")
    .update({ actual_minutes: total })
    .eq("id", taskId)
    .eq("user_id", user.id);
}

export async function startSession(todoId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: todo, error: todoError } = await supabase
      .from("todos")
      .select("id, task_id, scheduled_start, status, tasks(title, is_leaf)")
      .eq("id", todoId)
      .eq("user_id", user.id)
      .single();

    if (todoError || !todo) {
      return { success: false, error: "Todo が見つかりません" };
    }

    if (!todo.scheduled_start) {
      return {
        success: false,
        error: "未配置の Todo は計測を開始できません。タイムラインに配置してください。",
      };
    }

    if (todo.status !== "pending") {
      return { success: false, error: "完了済みの Todo は計測できません" };
    }

    const { data: active } = await supabase
      .from("work_sessions")
      .select("id")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .maybeSingle();

    if (active) {
      return {
        success: false,
        error: "既に計測中のセッションがあります。先に停止してください。",
      };
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("work_sessions").insert({
      user_id: user.id,
      task_id: todo.task_id,
      todo_id: todo.id,
      started_at: now,
      source: "timer",
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "既に計測中のセッションがあります。",
        };
      }
      return { success: false, error: error.message };
    }

    await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", todo.task_id)
      .eq("user_id", user.id);

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "開始に失敗しました",
    };
  }
}

export async function stopSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: session, error: fetchError } = await supabase
      .from("work_sessions")
      .select("id, task_id, started_at, ended_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "セッションが見つかりません" };
    }

    if (session.ended_at) {
      return { success: false, error: "既に停止済みです" };
    }

    const endedAt = new Date();
    const startedAt = new Date(session.started_at);
    const duration = durationMinutesBetween(startedAt, endedAt);

    const { error } = await supabase
      .from("work_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration_minutes: duration,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    await recalculateActualMinutes(session.task_id);

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "停止に失敗しました",
    };
  }
}

export async function editSessionTimes(
  sessionId: string,
  startedAtIso: string,
  endedAtIso: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: session, error: fetchError } = await supabase
      .from("work_sessions")
      .select("id, task_id, ended_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "セッションが見つかりません" };
    }

    if (!session.ended_at) {
      return {
        success: false,
        error: "計測中のセッションはここから修正できません",
      };
    }

    const startedAt = new Date(startedAtIso);
    const endedAt = new Date(endedAtIso);

    if (endedAt <= startedAt) {
      return { success: false, error: "終了時刻は開始時刻より後にしてください" };
    }

    const duration = durationMinutesBetween(startedAt, endedAt);

    const { error } = await supabase
      .from("work_sessions")
      .update({
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_minutes: duration,
        source: "edited",
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    await recalculateActualMinutes(session.task_id);

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "更新に失敗しました",
    };
  }
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: session, error: fetchError } = await supabase
      .from("work_sessions")
      .select("id, task_id, ended_at")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !session) {
      return { success: false, error: "セッションが見つかりません" };
    }

    if (!session.ended_at) {
      return {
        success: false,
        error: "計測中のセッションは削除できません。先に停止してください。",
      };
    }

    const { error } = await supabase
      .from("work_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    await recalculateActualMinutes(session.task_id);

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "削除に失敗しました",
    };
  }
}

export async function addManualSession(
  todoId: string,
  startedAtIso: string,
  endedAtIso: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: todo, error: todoError } = await supabase
      .from("todos")
      .select("id, task_id, scheduled_start")
      .eq("id", todoId)
      .eq("user_id", user.id)
      .single();

    if (todoError || !todo) {
      return { success: false, error: "Todo が見つかりません" };
    }

    if (!todo.scheduled_start) {
      return {
        success: false,
        error: "未配置の Todo にはセッションを追加できません",
      };
    }

    const startedAt = new Date(startedAtIso);
    const endedAt = new Date(endedAtIso);

    if (endedAt <= startedAt) {
      return { success: false, error: "終了時刻は開始時刻より後にしてください" };
    }

    const duration = durationMinutesBetween(startedAt, endedAt);

    const { error } = await supabase.from("work_sessions").insert({
      user_id: user.id,
      task_id: todo.task_id,
      todo_id: todo.id,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_minutes: duration,
      source: "manual",
    });

    if (error) return { success: false, error: error.message };

    await recalculateActualMinutes(todo.task_id);

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "追加に失敗しました",
    };
  }
}

export async function getActiveSession() {
  const { supabase, user } = await getAuthedUser();

  const { data } = await supabase
    .from("work_sessions")
    .select(
      "id, task_id, todo_id, started_at, ended_at, duration_minutes, source, todos(id, tasks(title))",
    )
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  return data;
}

export async function getRecentSessions(limit = 10) {
  const { supabase, user } = await getAuthedUser();

  const { data } = await supabase
    .from("work_sessions")
    .select(
      "id, task_id, todo_id, started_at, ended_at, duration_minutes, source, todos(id, tasks(title))",
    )
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
