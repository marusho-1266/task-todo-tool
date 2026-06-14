"use client";

import { useEffect, useMemo, useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { deleteProject, reassignAndDeleteProject } from "@/app/actions/projects";
import { deleteTask } from "@/app/actions/tasks";
import {
  backlogTaskDraggableId,
  buildFlatGroup,
  groupBacklogByProject,
  sortBacklogByDueDateAndPriority,
  sortBacklogByPriorityAndDueDate,
} from "@/lib/tasks";
import type { BacklogProject, BacklogSortMode, BacklogTask } from "@/lib/types";
import {
  persistSortMode,
  readStoredSortMode,
} from "@/lib/backlog-sidebar";
import { useToast } from "@/components/ui/Toast";
import { ProjectModal } from "@/components/backlog/ProjectModal";
import { TaskModal } from "@/components/backlog/TaskModal";

type Props = {
  projects: BacklogProject[];
  tasks: BacklogTask[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

type DraggableLeaf = {
  task: BacklogTask;
  index: number;
};

function collectDraggableLeaves(
  groups: ReturnType<typeof groupBacklogByProject>,
): DraggableLeaf[] {
  const leaves: DraggableLeaf[] = [];
  let index = 0;

  for (const group of groups) {
    for (const task of group.tasks) {
      const children = group.children.get(task.id) ?? [];
      if (children.length > 0) {
        for (const child of children) {
          leaves.push({ task: child, index: index++ });
        }
      } else if (task.is_leaf) {
        leaves.push({ task, index: index++ });
      }
    }
  }

  return leaves;
}

const PRIORITY_LABELS = ["", "中", "高"] as const;

function BacklogTaskRow({
  task,
  index,
  draggable,
  showMeta,
  onEdit,
  isCompleted,
}: {
  task: BacklogTask;
  index: number;
  draggable: boolean;
  showMeta?: boolean;
  onEdit: (task: BacklogTask) => void;
  isCompleted?: boolean;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className={`min-w-0 flex-1 truncate text-sm ${isCompleted ? "line-through" : ""}`} style={isCompleted ? { color: "var(--color-ink-muted)" } : {}}>{task.title}</span>
      {showMeta && (
        <span className="flex shrink-0 gap-1">
          {task.priority > 0 && (
            <span
              className="rounded px-1 py-0.5 text-[10px] font-medium"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-ink)" }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
              {task.due_date.slice(5)}
            </span>
          )}
        </span>
      )}
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="shrink-0 rounded px-1.5 py-0.5 text-xs"
        style={{ color: "var(--color-ink-muted)" }}
      >
        編集
      </button>
    </div>
  );

  if (!draggable) {
    return (
      <li
        className="rounded-[var(--radius-sm)] border px-3 py-2"
        style={{
          borderColor: "var(--color-rule)",
          background: isCompleted ? "var(--color-paper)" : "var(--color-paper-2)",
          fontFamily: "var(--font-body)",
          color: isCompleted ? "var(--color-ink-muted)" : "var(--color-ink-muted)",
          opacity: isCompleted ? 0.7 : 1,
        }}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide">親</span>
        {inner}
      </li>
    );
  }

  return (
    <Draggable draggableId={backlogTaskDraggableId(task.id)} index={index}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="rounded-[var(--radius-sm)] border px-3 py-2 text-sm shadow-sm"
          style={{
            ...provided.draggableProps.style,
            borderColor: snapshot.isDragging
              ? "var(--color-accent)"
              : "var(--color-rule)",
            background: "var(--color-paper)",
            fontFamily: "var(--font-body)",
            color: isCompleted ? "var(--color-ink-muted)" : "var(--color-ink)",
            opacity: isCompleted ? 0.7 : 1,
          }}
        >
          {inner}
        </li>
      )}
    </Draggable>
  );
}

function BacklogContent({
  groups,
  indexByTaskId,
  showGroupHeaders,
  showMeta,
  showDone,
  onEditProject,
  onEditTask,
  onNewChildTask,
}: {
  groups: ReturnType<typeof groupBacklogByProject>;
  indexByTaskId: Map<string, number>;
  showGroupHeaders: boolean;
  showMeta: boolean;
  showDone: boolean;
  onEditProject: (project: BacklogProject) => void;
  onEditTask: (task: BacklogTask) => void;
  onNewChildTask: (parentId: string, projectId: string | null) => void;
}) {
  return (
    <Droppable droppableId="backlog" isDropDisabled>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        >
          {groups.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
            >
              バックログにタスクがありません。「+ タスク」から追加できます。
            </p>
          ) : (
            <>
              {groups.map((group) => (
                <section key={group.project?.id ?? "none"} className="mb-4 last:mb-0">
                  {showGroupHeaders && (
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
                      >
                        {group.project?.title ?? "プロジェクトなし"}
                      </h3>
                      {group.project && !group.project.is_system && (
                        <button
                          type="button"
                          onClick={() => onEditProject(group.project!)}
                          className="text-xs"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          編集
                        </button>
                      )}
                    </div>
                  )}

                  <ul className="flex flex-col gap-2">
                    {group.tasks.map((task) => {
                      const children = group.children.get(task.id) ?? [];
                      const isParent = children.length > 0;

                      if (isParent) {
                        return (
                          <li key={task.id} className="flex flex-col gap-1">
                            <BacklogTaskRow
                              task={task}
                              index={0}
                              draggable={false}
                              showMeta={showMeta}
                              onEdit={onEditTask}
                            />
                            <ul
                              className="ml-3 flex flex-col gap-1 border-l pl-2"
                              style={{ borderColor: "var(--color-rule)" }}
                            >
                              {children.map((child) => (
                                <BacklogTaskRow
                                  key={child.id}
                                  task={child}
                                  index={indexByTaskId.get(child.id) ?? 0}
                                  draggable
                                  showMeta={showMeta}
                                  onEdit={onEditTask}
                                  isCompleted={child.status === "done"}
                                />
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={() => onNewChildTask(task.id, task.project_id)}
                              className="ml-3 text-left text-xs"
                              style={{ color: "var(--color-accent)" }}
                            >
                              + 子タスク
                            </button>
                          </li>
                        );
                      }

                      if (!task.is_leaf) return null;

                      return (
                        <BacklogTaskRow
                          key={task.id}
                          task={task}
                          index={indexByTaskId.get(task.id) ?? 0}
                          draggable
                          showMeta={showMeta}
                          onEdit={onEditTask}
                          isCompleted={task.status === "done"}
                        />
                      );
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

const SORT_MODE_LABELS: Record<BacklogSortMode, string> = {
  project: "プロジェクト",
  due_date_priority: "期日順",
  priority_due_date: "優先度順",
};

function SidebarHeader({
  onClose,
  onNewProject,
  onNewTask,
  sortMode,
  onSortChange,
  showDone,
  onShowDoneChange,
}: {
  onClose: () => void;
  onNewProject: () => void;
  onNewTask: () => void;
  sortMode: BacklogSortMode;
  onSortChange: (mode: BacklogSortMode) => void;
  showDone: boolean;
  onShowDoneChange: (value: boolean) => void;
}) {
  return (
    <header
      className="flex shrink-0 flex-col gap-2 border-b px-3 py-3"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-[var(--radius-sm)] px-1.5 py-1 text-sm transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-muted)" }}
          aria-label="バックログを閉じる"
          title="バックログを閉じる"
        >
          ‹
        </button>
        <h2
          className="min-w-0 flex-1 truncate text-sm font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          バックログ / Inbox
        </h2>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={onNewProject}
          className="rounded-[var(--radius-sm)] border px-2 py-0.5"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
        >
          + プロジェクト
        </button>
        <button
          type="button"
          onClick={onNewTask}
          className="rounded-[var(--radius-sm)] border px-2 py-0.5"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
        >
          + タスク
        </button>
      </div>
      <div className="flex gap-1">
        {(["project", "due_date_priority", "priority_due_date"] as const).map((mode) => {
          const active = sortMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSortChange(mode)}
              className="flex-1 rounded-[var(--radius-sm)] border py-0.5 text-[10px] transition-colors"
              style={{
                borderColor: active ? "var(--color-accent)" : "var(--color-rule)",
                background: active ? "var(--color-accent)" : "transparent",
                color: active ? "var(--color-accent-ink)" : "var(--color-ink-muted)",
              }}
            >
              {SORT_MODE_LABELS[mode]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onShowDoneChange(!showDone)}
          className="rounded-[var(--radius-sm)] border px-2 py-0.5 text-[10px] transition-colors"
          style={{
            borderColor: showDone ? "var(--color-accent)" : "var(--color-rule)",
            background: showDone ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
            color: showDone ? "var(--color-accent)" : "var(--color-ink-muted)",
          }}
        >
          完了も表示
        </button>
      </div>
    </header>
  );
}

export function BacklogPanel({
  projects,
  tasks,
  open,
  onOpenChange,
  onChanged,
}: Props) {
  const { showToast } = useToast();
  const [editProject, setEditProject] = useState<BacklogProject | null>(null);
  const [editTask, setEditTask] = useState<BacklogTask | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<BacklogSortMode>("project");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const stored = readStoredSortMode();
    if (stored) setSortMode(stored);
  }, []);

  const handleSortChange = (mode: BacklogSortMode) => {
    setSortMode(mode);
    persistSortMode(mode);
  };

  const groups = useMemo(() => {
    if (sortMode === "project") return groupBacklogByProject(projects, tasks, showDone);
    const sorted =
      sortMode === "due_date_priority"
        ? sortBacklogByDueDateAndPriority(tasks, showDone)
        : sortBacklogByPriorityAndDueDate(tasks, showDone);
    return buildFlatGroup(sorted, showDone);
  }, [projects, tasks, sortMode, showDone]);

  const draggableLeaves = useMemo(() => collectDraggableLeaves(groups), [groups]);
  const indexByTaskId = useMemo(
    () => new Map(draggableLeaves.map((d) => [d.task.id, d.index])),
    [draggableLeaves],
  );

  const openNewTask = () => {
    setNewTaskParentId(null);
    setNewTaskProjectId(null);
    setShowNewTask(true);
  };

  const contentProps = {
    groups,
    indexByTaskId,
    showDone,
    showGroupHeaders: sortMode === "project",
    showMeta: sortMode !== "project",
    onEditProject: setEditProject,
    onEditTask: setEditTask,
    onNewChildTask: (parentId: string, projectId: string | null) => {
      setNewTaskParentId(parentId);
      setNewTaskProjectId(projectId);
      setShowNewTask(true);
    },
  };

  const asideStyle = {
    borderColor: "var(--color-rule)",
    background: "var(--color-paper-2)",
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={() => onOpenChange(false)}
          aria-label="バックログを閉じる"
        />
      )}

      {!open ? (
        <>
          <aside
            className="hidden w-10 shrink-0 flex-col items-center border-r py-3 lg:flex"
            style={asideStyle}
          >
            <button
              type="button"
              onClick={() => onOpenChange(true)}
              className="rounded-[var(--radius-sm)] px-1 py-2 text-sm transition-colors hover:bg-[var(--color-paper-3)]"
              style={{ color: "var(--color-ink-muted)" }}
              aria-label="バックログを開く"
              title="バックログを開く"
            >
              ›
            </button>
            <span
              className="mt-3 text-[10px] font-medium tracking-widest uppercase [writing-mode:vertical-rl]"
              style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
            >
              Backlog
            </span>
          </aside>

          <button
            type="button"
            onClick={() => onOpenChange(true)}
            className="fixed top-1/2 left-0 z-30 -translate-y-1/2 rounded-r-[var(--radius-sm)] border border-l-0 px-1.5 py-3 text-[10px] font-medium tracking-wide uppercase shadow-sm lg:hidden"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-paper-2)",
              color: "var(--color-ink-muted)",
              fontFamily: "var(--font-body)",
            }}
            aria-label="バックログを開く"
          >
            BL
          </button>
        </>
      ) : (
        <aside
          className="flex min-h-0 w-72 shrink-0 flex-col border-r max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[min(20rem,85vw)] max-lg:shadow-lg"
          style={asideStyle}
        >
          <SidebarHeader
            onClose={() => onOpenChange(false)}
            onNewProject={() => setShowNewProject(true)}
            onNewTask={openNewTask}
            sortMode={sortMode}
            onSortChange={handleSortChange}
            showDone={showDone}
            onShowDoneChange={setShowDone}
          />
          <BacklogContent
            {...contentProps}
            showGroupHeaders={sortMode === "project"}
            showMeta={sortMode !== "project"}
          />
        </aside>
      )}

      {(showNewProject || editProject) && (
        <ProjectModal
          project={editProject}
          onClose={() => {
            setShowNewProject(false);
            setEditProject(null);
          }}
          onSaved={() => {
            setShowNewProject(false);
            setEditProject(null);
            onChanged();
          }}
          onDelete={async (id) => {
            const res = await deleteProject(id);
            if (!res.success) {
              if (res.error === "タスクが紐づいているプロジェクトは削除できません") {
                if (window.confirm("このプロジェクトにはタスクがあります。タスクをInboxに移動してから削除しますか？")) {
                  const res2 = await reassignAndDeleteProject(id);
                  if (!res2.success) showToast(res2.error);
                  else {
                    showToast("プロジェクトを削除しました", "success");
                    setEditProject(null);
                    onChanged();
                  }
                }
              } else {
                showToast(res.error);
              }
            } else {
              showToast("プロジェクトを削除しました", "success");
              setEditProject(null);
              onChanged();
            }
          }}
        />
      )}

      {(showNewTask || editTask) && (
        <TaskModal
          task={editTask}
          projects={projects}
          defaultParentId={newTaskParentId}
          defaultProjectId={newTaskProjectId}
          onClose={() => {
            setShowNewTask(false);
            setEditTask(null);
            setNewTaskParentId(null);
            setNewTaskProjectId(null);
          }}
          onSaved={() => {
            setShowNewTask(false);
            setEditTask(null);
            setNewTaskParentId(null);
            setNewTaskProjectId(null);
            onChanged();
          }}
          onDelete={async (id) => {
            const res = await deleteTask(id);
            if (!res.success) showToast(res.error);
            else {
              showToast("タスクを削除しました", "success");
              setEditTask(null);
              onChanged();
            }
          }}
        />
      )}
    </>
  );
}
