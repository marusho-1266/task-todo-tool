"use server";

import { revalidatePath } from "next/cache";
import { parseBacklogProjects, PROJECT_SELECT } from "@/lib/tasks";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, BacklogProject, BacklogStatus } from "@/lib/types";

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未ログイン");
  return { supabase, user };
}

export async function getProjects(): Promise<BacklogProject[]> {
  const { supabase, user } = await getAuthedUser();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("is_system", { ascending: false })
    .order("title");

  if (error) throw new Error(error.message);
  return parseBacklogProjects(data);
}

export async function createProject(
  title: string,
  category?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "タイトルを入力してください" };

    const { supabase, user } = await getAuthedUser();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: trimmed,
        status: "not_started",
        category: category?.trim() || null,
        is_system: false,
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

export async function updateProject(
  projectId: string,
  fields: {
    title?: string;
    status?: BacklogStatus;
    description?: string | null;
    category?: string | null;
    color?: string | null;
  },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: existing } = await supabase
      .from("projects")
      .select("is_system")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return { success: false, error: "プロジェクトが見つかりません" };
    }

    const updates: Record<string, unknown> = {};
    if (fields.title !== undefined) {
      const trimmed = fields.title.trim();
      if (!trimmed) return { success: false, error: "タイトルを入力してください" };
      updates.title = trimmed;
    }
    if (fields.status !== undefined) updates.status = fields.status;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.color !== undefined) updates.color = fields.color;

    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
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

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthedUser();

    const { data: existing } = await supabase
      .from("projects")
      .select("is_system")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return { success: false, error: "プロジェクトが見つかりません" };
    }

    if (existing.is_system) {
      return { success: false, error: "システムプロジェクトは削除できません" };
    }

    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (count && count > 0) {
      return {
        success: false,
        error: "タスクが紐づいているプロジェクトは削除できません",
      };
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
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
