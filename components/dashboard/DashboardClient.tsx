"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { signOut } from "@/app/actions/auth";
import {
  moveTodoToUnplaced,
  updateTodoSchedule,
} from "@/app/actions/todos";
import { formatDisplayDate, isToday, slotIndexToMinutes } from "@/lib/time";
import type { Todo, WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { DateNav } from "@/components/dashboard/DateNav";
import { BacklogStub } from "@/components/dashboard/BacklogStub";
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
};

export function DashboardClient({
  selectedDate,
  dateStr,
  todos,
  activeSession,
  daySessions,
  userEmail,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [editSession, setEditSession] = useState<WorkSession | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);

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
        className="flex min-h-full flex-1 flex-col"
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

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
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

        <BacklogStub />

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
