import type { WorkSession } from "@/lib/types";

export const INTERRUPT_PROJECT_NAME = "問合せ・差し込み";
export const INTERRUPT_BUCKET_TASK_TITLE = "（割込記録）";

export function isInterruptBucketTask(task: { title: string }): boolean {
  return task.title === INTERRUPT_BUCKET_TASK_TITLE;
}

export function getSessionDisplayTitle(session: WorkSession): string {
  const label = session.label?.trim();
  if (label) return label;
  return session.todos?.tasks?.title ?? "（無題）";
}
