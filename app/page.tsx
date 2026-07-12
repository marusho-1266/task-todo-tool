import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWorkSessions, WORK_SESSION_SELECT } from "@/lib/sessions";
import { parseBacklogProjects, parseBacklogTasks, PROJECT_SELECT, TASK_SELECT } from "@/lib/tasks";
import { parseTodoRows, TODO_WITH_TASK_SELECT } from "@/lib/todos";
import { dayBounds, formatDateParam, getTodayJST, isToday, parseDateParam } from "@/lib/time";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedDate = parseDateParam(params.date);
  const dateStr = formatDateParam(selectedDate);
  const todayStr = formatDateParam(getTodayJST());

  const { data: { session } } = await supabase.auth.getSession();
  const hasProviderToken = !!session?.provider_token;

  const [
    { data: todosRaw, error: todosError },
    { data: activeSessionRaw, error: activeSessionError },
    { data: daySessionsRaw, error: daySessionsError },
    { data: projectsRaw, error: projectsError },
    { data: tasksRaw, error: tasksError },
    { data: carryOverRaw, error: carryOverError },
  ] = await Promise.all([
    supabase
      .from("todos")
      .select(TODO_WITH_TASK_SELECT)
      .eq("user_id", user.id)
      .eq("date", dateStr)
      .in("status", ["pending", "done", "rolled_over"])
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("work_sessions")
      .select(WORK_SESSION_SELECT)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .maybeSingle(),
    (async () => {
      const { start: dayStart, end: dayEnd } = dayBounds(dateStr);
      return supabase
        .from("work_sessions")
        .select(WORK_SESSION_SELECT)
        .eq("user_id", user.id)
        .gte("started_at", dayStart.toISOString())
        .lte("started_at", dayEnd.toISOString())
        .order("started_at", { ascending: true });
    })(),
    supabase
      .from("projects")
      .select(PROJECT_SELECT)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("is_system", { ascending: false })
      .order("title"),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("user_id", user.id)
      .order("title"),
    isToday(selectedDate)
      ? supabase
          .from("todos")
          .select(TODO_WITH_TASK_SELECT)
          .eq("user_id", user.id)
          .eq("date", todayStr)
          .eq("status", "pending")
          .eq("is_ad_hoc", false)
          .order("scheduled_start", { ascending: true, nullsFirst: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (todosError) throw new Error(todosError.message);
  if (activeSessionError) {
    throw new Error(
      `active session query failed (user=${user.id}, date=${dateStr}): ${activeSessionError.message}`,
    );
  }
  if (daySessionsError) {
    throw new Error(
      `day sessions query failed (user=${user.id}, date=${dateStr}): ${daySessionsError.message}`,
    );
  }
  if (projectsError) throw new Error(projectsError.message);
  if (tasksError) throw new Error(tasksError.message);
  if (carryOverError) throw new Error(carryOverError.message);

  const todos = parseTodoRows(todosRaw);
  const activeSession =
    parseWorkSessions(activeSessionRaw ? [activeSessionRaw] : [])[0] ?? null;
  const daySessions = parseWorkSessions(daySessionsRaw);
  const projects = parseBacklogProjects(projectsRaw);
  const backlogTasks = parseBacklogTasks(tasksRaw);
  const carryOverCandidates = parseTodoRows(carryOverRaw);

  return (
    <ToastProvider>
      <DashboardClient
        selectedDate={selectedDate}
        dateStr={dateStr}
        todos={todos}
        activeSession={activeSession}
        daySessions={daySessions}
        userEmail={user.email ?? ""}
        projects={projects}
        backlogTasks={backlogTasks}
        carryOverCandidates={carryOverCandidates}
        hasProviderToken={hasProviderToken}
      />
    </ToastProvider>
  );
}
