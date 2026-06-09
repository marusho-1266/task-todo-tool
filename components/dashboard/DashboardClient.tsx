"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getDefaultBacklogSidebarOpen,
  persistBacklogSidebarOpen,
  readStoredBacklogSidebarOpen,
} from "@/lib/backlog-sidebar";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { signOut } from "@/app/actions/auth";
import {
  addUnplacedTodoFromBacklog,
  scheduleBacklogTask,
} from "@/app/actions/tasks";
import {
  moveTodoToUnplaced,
  updateTodoSchedule,
} from "@/app/actions/todos";
import { parseBacklogTaskDraggableId } from "@/lib/tasks";
import { formatDisplayDate, isToday, slotIndexToMinutes } from "@/lib/time";
import type { BacklogProject, BacklogTask, Todo, WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { BacklogPanel } from "@/components/dashboard/BacklogPanel";
import { DateNav } from "@/components/dashboard/DateNav";
import { PrepareTomorrowModal } from "@/components/prepare-tomorrow/PrepareTomorrowModal";
import { SessionBar } from "@/components/session-bar/SessionBar";
import { Timeline } from "@/components/timeline/Timeline";
import { UnplacedPanel } from "@/components/unplaced/UnplacedPanel";
import { EditSessionModal } from "@/components/sessions/EditSessionModal";
import { ManualSessionModal } from "@/components/sessions/ManualSessionModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
};

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
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editSession, setEditSession] = useState<WorkSession | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showPrepareTomorrow, setShowPrepareTomorrow] = useState(false);
  const [backlogOpen, setBacklogOpen] = useState(true);

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

  const unplaced = todos.filter(
    (t) => !t.scheduled_start && t.status === "pending",
  );
  const placed = todos.filter(
    (t) => t.scheduled_start && t.status === "pending",
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;

      const backlogTaskId = parseBacklogTaskDraggableId(draggableId);
      if (backlogTaskId) {
        if (destination.droppableId === "unplaced") {
          const res = await addUnplacedTodoFromBacklog(backlogTaskId, dateStr);
          if (!res.success) showToast(res.error);
          else refresh();
          return;
        }

        if (destination.droppableId.startsWith("slot-")) {
          const slotIndex = parseInt(
            destination.droppableId.replace("slot-", ""),
            10,
          );
          const minutes = slotIndexToMinutes(slotIndex);
          const res = await scheduleBacklogTask(
            backlogTaskId,
            dateStr,
            minutes,
          );
          if (!res.success) showToast(res.error);
          else refresh();
        }
        return;
      }

      const todo = todos.find((t) => t.id === draggableId);
      if (!todo) return;

      if (destination.droppableId === "unplaced") {
        if (source.droppableId === "unplaced") return;
        const res = await moveTodoToUnplaced(draggableId);
        if (!res.success) showToast(res.error);
        else refresh();
        return;
      }

      if (destination.droppableId.startsWith("slot-")) {
        const slotIndex = parseInt(
          destination.droppableId.replace("slot-", ""),
          10,
        );
        const minutes = slotIndexToMinutes(slotIndex);
        const res = await updateTodoSchedule(
          draggableId,
          dateStr,
          minutes,
          todo.planned_minutes,
        );
        if (!res.success) showToast(res.error);
        else refresh();
      }
    },
    [dateStr, refresh, showToast, todos],
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
            <Timeline
              date={dateStr}
              placedTodos={placed}
              daySessions={daySessions}
              activeSessionId={activeSession?.id ?? null}
              activeSessionTodoId={activeSession?.todo_id ?? null}
              onUpdated={refresh}
              onEditSession={setEditSession}
            />
            <UnplacedPanel todos={unplaced} />
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
