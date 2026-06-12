import { isInterruptBucketTask } from "@/lib/interrupt";
import { isBacklogStatus, type BacklogProject, type BacklogTask } from "@/lib/types";

export const TASK_SELECT =
  "id, title, project_id, parent_id, is_leaf, status, estimate_minutes, due_date, description, priority" as const;

export const PROJECT_SELECT =
  "id, title, is_system, color, status, description, category" as const;

function parseBacklogTask(value: unknown): BacklogTask | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;

  return {
    id: row.id,
    title: row.title,
    project_id: typeof row.project_id === "string" ? row.project_id : null,
    parent_id: typeof row.parent_id === "string" ? row.parent_id : null,
    is_leaf: typeof row.is_leaf === "boolean" ? row.is_leaf : true,
    status: isBacklogStatus(row.status) ? row.status : "not_started",
    estimate_minutes:
      typeof row.estimate_minutes === "number" ? row.estimate_minutes : null,
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    description: typeof row.description === "string" ? row.description : null,
    priority: typeof row.priority === "number" ? row.priority : 0,
  };
}

function parseBacklogProject(value: unknown): BacklogProject | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") return null;

  return {
    id: row.id,
    title: row.title,
    is_system: typeof row.is_system === "boolean" ? row.is_system : false,
    color: typeof row.color === "string" ? row.color : null,
    status: isBacklogStatus(row.status) ? row.status : "not_started",
    description: typeof row.description === "string" ? row.description : null,
    category: typeof row.category === "string" ? row.category : null,
  };
}

export function parseBacklogTasks(data: unknown): BacklogTask[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const task = parseBacklogTask(row);
    if (!task || isInterruptBucketTask(task)) return [];
    return [task];
  });
}

export function parseBacklogProjects(data: unknown): BacklogProject[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const project = parseBacklogProject(row);
    return project ? [project] : [];
  });
}

export const BACKLOG_TASK_DRAG_PREFIX = "backlog-task-";

export function backlogTaskDraggableId(taskId: string): string {
  return `${BACKLOG_TASK_DRAG_PREFIX}${taskId}`;
}

export function parseBacklogTaskDraggableId(
  draggableId: string,
): string | null {
  if (!draggableId.startsWith(BACKLOG_TASK_DRAG_PREFIX)) return null;
  return draggableId.slice(BACKLOG_TASK_DRAG_PREFIX.length);
}

export function groupBacklogByProject(
  projects: BacklogProject[],
  tasks: BacklogTask[],
): {
  project: BacklogProject | null;
  tasks: BacklogTask[];
  children: Map<string, BacklogTask[]>;
}[] {
  const activeTasks = tasks.filter((t) => t.status !== "done");
  const parentIds = new Set(
    activeTasks.filter((t) => t.parent_id).map((t) => t.parent_id!),
  );

  const roots = activeTasks.filter(
    (t) => !t.parent_id || !activeTasks.some((p) => p.id === t.parent_id),
  );

  function childrenOf(parentId: string): BacklogTask[] {
    return activeTasks.filter((t) => t.parent_id === parentId);
  }

  const groups: {
    project: BacklogProject | null;
    tasks: BacklogTask[];
    children: Map<string, BacklogTask[]>;
  }[] = [];

  for (const project of projects) {
    const projectRoots = roots.filter((t) => t.project_id === project.id);
    if (projectRoots.length === 0) continue;
    const children = new Map<string, BacklogTask[]>();
    for (const t of projectRoots) {
      if (parentIds.has(t.id)) {
        children.set(t.id, childrenOf(t.id));
      }
    }
    groups.push({ project, tasks: projectRoots, children });
  }

  const noProjectRoots = roots.filter((t) => !t.project_id);
  if (noProjectRoots.length > 0) {
    const children = new Map<string, BacklogTask[]>();
    for (const t of noProjectRoots) {
      if (parentIds.has(t.id)) {
        children.set(t.id, childrenOf(t.id));
      }
    }
    groups.push({ project: null, tasks: noProjectRoots, children });
  }

  return groups;
}

export function sortBacklogByDueDate(tasks: BacklogTask[]): BacklogTask[] {
  const active = tasks.filter((t) => t.status !== "done");
  return [...active].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function sortBacklogByPriority(tasks: BacklogTask[]): BacklogTask[] {
  const active = tasks.filter((t) => t.status !== "done");
  return [...active].sort((a, b) => {
    const diff = b.priority - a.priority;
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

export function buildFlatGroup(
  tasks: BacklogTask[],
): ReturnType<typeof groupBacklogByProject> {
  const roots = tasks.filter((t) => !t.parent_id);
  const childTasks = tasks.filter((t) => t.parent_id);
  const children = new Map<string, BacklogTask[]>();
  for (const root of roots) {
    const kids = childTasks.filter((c) => c.parent_id === root.id);
    if (kids.length > 0) children.set(root.id, kids);
  }
  return [{ project: null, tasks: roots, children }];
}

