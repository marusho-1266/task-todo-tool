"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDefaultBacklogSidebarOpen,
  persistBacklogSidebarOpen,
  readStoredBacklogSidebarOpen,
} from "@/lib/backlog-sidebar";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { signOut } from "@/app/actions/auth";
import { fetchCalendarEvents } from "@/app/actions/google-calendar";
import { scheduleBacklogTask } from "@/app/actions/tasks";
import { updateTodoSchedule } from "@/app/actions/todos";
import { parseBacklogTaskDraggableId } from "@/lib/tasks";
import { datetimeFromMinutes, formatDisplayDate, isToday, slotIndexToMinutes, snapMinutes, SNAP_MINUTES } from "@/lib/time";
import type { BacklogProject, BacklogTask, CalendarEvent, Todo, WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { BacklogPanel } from "@/components/dashboard/BacklogPanel";
import { DateNav } from "@/components/dashboard/DateNav";
import { PrepareTomorrowModal } from "@/components/prepare-tomorrow/PrepareTomorrowModal";
import { SessionBar } from "@/components/session-bar/SessionBar";
import { Timeline } from "@/components/timeline/Timeline";
import { EditSessionModal } from "@/components/sessions/EditSessionModal";
import { EditTodoScheduleModal } from "@/components/sessions/EditTodoScheduleModal";
import { ManualSessionModal } from "@/components/sessions/ManualSessionModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GoogleCalendarToggle } from "@/components/dashboard/GoogleCalendarToggle";

type Props = {
  selectedDate: Date;
  dateStr: string;
  todos: Todo[];
  activeSession: WorkSession | null;
  daySessions: WorkSession[];
  userEmail: string;
  projects: BacklogProject[];
  backlogTasks: BacklogTask[];
  carryOverCandidates: Todo[];
  hasProviderToken: boolean;
};

// Google Calendar 予定のクライアント側キャッシュ有効期間
const CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;

export function DashboardClient({
  selectedDate,
  dateStr,
  todos,
  activeSession,
  daySessions,
  userEmail,
  projects,
  backlogTasks,
  carryOverCandidates,
  hasProviderToken,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editSession, setEditSession] = useState<WorkSession | null>(null);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showPrepareTomorrow, setShowPrepareTomorrow] = useState(false);
  const [backlogOpen, setBacklogOpen] = useState(true);
  const [gcalEnabled, setGcalEnabled] = useState(false);

  // Google Calendar 予定はトグル ON 時にのみクライアントから遅延取得する。
  // 日付単位でキャッシュし、TTL 内は router.refresh() 後も再取得しない。
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const calendarCacheRef = useRef<
    Map<string, { events: CalendarEvent[]; fetchedAt: number }>
  >(new Map());

  useEffect(() => {
    if (!gcalEnabled || !hasProviderToken) return;

    const cached = calendarCacheRef.current.get(dateStr);
    if (cached && Date.now() - cached.fetchedAt < CALENDAR_CACHE_TTL_MS) {
      setCalendarEvents(cached.events);
      return;
    }

    // 取得完了まで前の日付の予定を出さない
    setCalendarEvents([]);
    let cancelled = false;
    fetchCalendarEvents(dateStr).then((events) => {
      if (cancelled) return;
      if (events === null) {
        // 取得失敗時はキャッシュに書き込まず、次回の effect 実行時に再試行させる
        return;
      }
      calendarCacheRef.current.set(dateStr, { events, fetchedAt: Date.now() });
      setCalendarEvents(events);
    }).catch(() => {
      // 呼び出し自体が reject した場合もキャッシュに書き込まず、次回の effect 実行時に再試行させる
    });
    return () => {
      cancelled = true;
    };
  }, [gcalEnabled, hasProviderToken, dateStr]);

  // ローカルコピーで即時 UI 更新（オプティミスティック更新）
  const [localTodos, setLocalTodos] = useState<Todo[]>(todos);
  useEffect(() => {
    // router.refresh() 後にサーバーの確定値で同期
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from server props
    setLocalTodos(todos);
  }, [todos]);

  const handleOptimisticTodoUpdate = useCallback(
    (todoId: string, scheduled_start: string | null, planned_minutes: number) => {
      setLocalTodos((current) =>
        current.map((t) =>
          t.id === todoId ? { ...t, scheduled_start, planned_minutes } : t,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    // Mount-only sync from localStorage; initial state is true for SSR/hydration match.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external store (localStorage)
    setBacklogOpen(
      readStoredBacklogSidebarOpen() ?? getDefaultBacklogSidebarOpen(),
    );
  }, []);

  const handleBacklogOpenChange = useCallback((open: boolean) => {
    setBacklogOpen(open);
    persistBacklogSidebarOpen(open);
  }, []);

  const placed = useMemo(
    () =>
      localTodos.filter(
        (t) =>
          t.scheduled_start &&
          (t.status === "pending" || t.status === "rolled_over") &&
          !t.is_ad_hoc,
      ),
    [localTodos],
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination } = result;
      if (!destination) return;

      const backlogTaskId = parseBacklogTaskDraggableId(draggableId);
      if (backlogTaskId) {
        if (destination.droppableId.startsWith("slot-")) {
          const slotIndex = parseInt(
            destination.droppableId.replace("slot-", ""),
            10,
          );
          const minutes = slotIndexToMinutes(slotIndex);
          const scheduledStartIso = datetimeFromMinutes(dateStr, minutes).toISOString();

          // バックログタスクを一時 Todo として即時追加（オプティミスティック更新）
          const backlogTask = backlogTasks.find((t) => t.id === backlogTaskId);
          const tempId = `optimistic-${backlogTaskId}-${Date.now()}`;
          if (backlogTask) {
            const plannedMinutes = Math.max(
              SNAP_MINUTES,
              snapMinutes(backlogTask.estimate_minutes ?? 30),
            );
            setLocalTodos((current) => [
              ...current,
              {
                id: tempId,
                user_id: "",
                task_id: backlogTaskId,
                date: dateStr,
                scheduled_start: scheduledStartIso,
                planned_minutes: plannedMinutes,
                status: "pending" as const,
                is_ad_hoc: false,
                tasks: {
                  id: backlogTaskId,
                  title: backlogTask.title,
                  project_id: backlogTask.project_id,
                  actual_minutes: 0,
                  is_leaf: backlogTask.is_leaf,
                },
              },
            ]);
          }

          const res = await scheduleBacklogTask(
            backlogTaskId,
            dateStr,
            scheduledStartIso,
          );
          if (!res.success) {
            // 失敗時は一時 Todo を削除
            setLocalTodos((current) => current.filter((t) => t.id !== tempId));
            showToast(res.error);
          } else {
            refresh();
          }
        }
        return;
      }

      const todo = localTodos.find((t) => t.id === draggableId);
      if (!todo) return;
      if (todo.status === "rolled_over") return;

      if (destination.droppableId.startsWith("slot-")) {
        const slotIndex = parseInt(
          destination.droppableId.replace("slot-", ""),
          10,
        );
        const minutes = slotIndexToMinutes(slotIndex);
        const scheduledStartIso = datetimeFromMinutes(dateStr, minutes).toISOString();
        // 未配置→タイムライン DnD も即時 UI 更新
        handleOptimisticTodoUpdate(draggableId, scheduledStartIso, todo.planned_minutes);
        const res = await updateTodoSchedule(
          draggableId,
          dateStr,
          scheduledStartIso,
          todo.planned_minutes,
        );
        if (!res.success) showToast(res.error);
        refresh();
      }
    },
    [backlogTasks, dateStr, handleOptimisticTodoUpdate, refresh, setLocalTodos, showToast, localTodos],
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className="flex h-dvh min-h-0 flex-col overflow-hidden"
        style={{ background: "var(--color-paper)" }}
      >
        {activeSession && (
          <SessionBar session={activeSession} onStopped={refresh} />
        )}

        <header
          className="border-b px-4 py-4"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
              >
                {isToday(selectedDate) ? "今日" : "指定日"}
              </p>
              <h1
                className="text-xl font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
              >
                {formatDisplayDate(selectedDate)}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggle />
              <DateNav selectedDate={selectedDate} />
              {isToday(selectedDate) && (
                <button
                  type="button"
                  onClick={() => setShowPrepareTomorrow(true)}
                  className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-accent-ink)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  明日を準備
                </button>
              )}
              <GoogleCalendarToggle
                hasProviderToken={hasProviderToken}
                onChange={setGcalEnabled}
              />
              <button
                type="button"
                onClick={() => setShowManualAdd(true)}
                className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                セッション追加
              </button>
              <span
                className="hidden text-xs sm:inline"
                style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
              >
                {userEmail}
              </span>
              <Link
                href="/projects"
                className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
                style={{
                  borderColor: "var(--color-rule)",
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                プロジェクト管理
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{
                    borderColor: "var(--color-rule)",
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1">
          <BacklogPanel
            projects={projects}
            tasks={backlogTasks}
            open={backlogOpen}
            onOpenChange={handleBacklogOpenChange}
            onChanged={refresh}
          />
          <div className="flex min-h-0 min-w-0 flex-1">
            <Timeline
              date={dateStr}
              placedTodos={placed}
              daySessions={daySessions}
              activeSessionId={activeSession?.id ?? null}
              activeSessionTodoId={activeSession?.todo_id ?? null}
              onUpdated={refresh}
              onEditSession={setEditSession}
              onEditTodo={setEditTodo}
              onOptimisticUpdate={handleOptimisticTodoUpdate}
              calendarEvents={gcalEnabled ? calendarEvents : []}
            />
          </div>
        </div>

        {showPrepareTomorrow && (
          <PrepareTomorrowModal
            todayDateStr={dateStr}
            initialCandidates={carryOverCandidates}
            onClose={() => setShowPrepareTomorrow(false)}
          />
        )}

        {editSession && (
          <EditSessionModal
            session={editSession}
            onClose={() => setEditSession(null)}
            onSaved={refresh}
          />
        )}

        {editTodo && (
          <EditTodoScheduleModal
            todo={editTodo}
            onClose={() => setEditTodo(null)}
            onSaved={refresh}
          />
        )}

        {showManualAdd && (
          <ManualSessionModal
            placedTodos={placed}
            onClose={() => setShowManualAdd(false)}
            onSaved={refresh}
          />
        )}
      </div>
    </DragDropContext>
  );
}
