"use client";

import { useMemo, useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { deleteProject } from "@/app/actions/projects";
import { deleteTask } from "@/app/actions/tasks";
import {
  backlogTaskDraggableId,
  groupBacklogByProject,
} from "@/lib/tasks";
import type { BacklogProject, BacklogTask } from "@/lib/types";
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

function BacklogTaskRow({
  task,
  index,
  draggable,
  onEdit,
}: {
  task: BacklogTask;
  index: number;
  draggable: boolean;
  onEdit: (task: BacklogTask) => void;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
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
          background: "var(--color-paper-2)",
          fontFamily: "var(--font-body)",
          color: "var(--color-ink-muted)",
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
            color: "var(--color-ink)",
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
  onEditProject,
  onEditTask,
  onNewChildTask,
}: {
  groups: ReturnType<typeof groupBacklogByProject>;
  indexByTaskId: Map<string, number>;
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
            groups.map((group) => (
              <section key={group.project?.id ?? "none"} className="mb-4 last:mb-0">
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
                                onEdit={onEditTask}
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
                        onEdit={onEditTask}
                      />
                    );
                  })}
                </ul>
              </section>
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function SidebarHeader({
  onClose,
  onNewProject,
  onNewTask,
}: {
  onClose: () => void;
  onNewProject: () => void;
  onNewTask: () => void;
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

  const groups = useMemo(
    () => groupBacklogByProject(projects, tasks),
    [projects, tasks],
  );

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
          />
          <BacklogContent {...contentProps} />
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
            if (!res.success) showToast(res.error);
            else {
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
