import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWorkSessions, WORK_SESSION_SELECT } from "@/lib/sessions";
import { parseTodoRows, TODO_WITH_TASK_SELECT } from "@/lib/todos";
import { dayBounds, formatDateParam, parseDateParam } from "@/lib/time";
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

  const { data: todosRaw, error: todosError } = await supabase
    .from("todos")
    .select(TODO_WITH_TASK_SELECT)
    .eq("user_id", user.id)
    .eq("date", dateStr)
    .in("status", ["pending", "done"])
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  if (todosError) {
    throw new Error(todosError.message);
  }

  const todos = parseTodoRows(todosRaw);

  const { data: activeSessionRaw, error: activeSessionError } = await supabase
    .from("work_sessions")
    .select(WORK_SESSION_SELECT)
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (activeSessionError) {
    throw new Error(
      `active session query failed (user=${user.id}, date=${dateStr}): ${activeSessionError.message}`,
    );
  }

  const activeSession = parseWorkSessions(
    activeSessionRaw ? [activeSessionRaw] : [],
  )[0] ?? null;

  const { start: dayStart, end: dayEnd } = dayBounds(dateStr);
  const { data: daySessionsRaw, error: daySessionsError } = await supabase
    .from("work_sessions")
    .select(WORK_SESSION_SELECT)
    .eq("user_id", user.id)
    .gte("started_at", dayStart.toISOString())
    .lte("started_at", dayEnd.toISOString())
    .order("started_at", { ascending: true });

  if (daySessionsError) {
    throw new Error(
      `day sessions query failed (user=${user.id}, date=${dateStr}): ${daySessionsError.message}`,
    );
  }

  const daySessions = parseWorkSessions(daySessionsRaw);

  return (
    <ToastProvider>
      <DashboardClient
        selectedDate={selectedDate}
        dateStr={dateStr}
        todos={todos}
        activeSession={activeSession}
        daySessions={daySessions}
        userEmail={user.email ?? ""}
      />
    </ToastProvider>
  );
}
