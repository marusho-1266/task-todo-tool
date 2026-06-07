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
    <>
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
      {draggable && (
        <span className="mt-0.5 block text-xs" style={{ color: "var(--color-ink-faint)" }}>
          タイムラインへドラッグ
        </span>
      )}
    </>
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

export function BacklogPanel({ projects, tasks, onChanged }: Props) {
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

  return (
    <>
      <details
        open
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <summary
          className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 select-none"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--color-ink-muted)" }}>
            ▼ バックログ / Inbox
          </span>
          <span className="flex gap-2 text-xs" onClick={(e) => e.preventDefault()}>
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="rounded-[var(--radius-sm)] border px-2 py-0.5"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
            >
              + プロジェクト
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTaskParentId(null);
                setNewTaskProjectId(null);
                setShowNewTask(true);
              }}
              className="rounded-[var(--radius-sm)] border px-2 py-0.5"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-muted)" }}
            >
              + タスク
            </button>
          </span>
        </summary>

        <Droppable droppableId="backlog" isDropDisabled>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="max-h-72 overflow-y-auto px-4 pb-4"
            >
              {groups.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}>
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
                          onClick={() => setEditProject(group.project!)}
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
                                onEdit={setEditTask}
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
                                    onEdit={setEditTask}
                                  />
                                ))}
                              </ul>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTaskParentId(task.id);
                                  setNewTaskProjectId(task.project_id);
                                  setShowNewTask(true);
                                }}
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
                            onEdit={setEditTask}
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
      </details>

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
