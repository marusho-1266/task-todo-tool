"use client";

import "@/app/globals.css";
import {
  ManualSessionModal,
  type ManualSessionModalPreviewState,
} from "@/components/sessions/ManualSessionModal";
import { ToastProvider } from "@/components/ui/Toast";
import type { Todo } from "@/lib/types";

const noop = () => {};

const mockTodos: Todo[] = [
  {
    id: "preview-todo-1",
    user_id: "preview-user",
    task_id: "preview-task-1",
    date: "2026-05-28",
    scheduled_start: "2026-05-28T00:00:00.000Z",
    planned_minutes: 30,
    status: "pending",
    is_ad_hoc: false,
    tasks: {
      id: "preview-task-1",
      title: "設計レビュー",
      project_id: null,
      actual_minutes: 0,
      is_leaf: true,
    },
  },
  {
    id: "preview-todo-2",
    user_id: "preview-user",
    task_id: "preview-task-2",
    date: "2026-05-28",
    scheduled_start: "2026-05-28T01:00:00.000Z",
    planned_minutes: 45,
    status: "pending",
    is_ad_hoc: false,
    tasks: {
      id: "preview-task-2",
      title: "問合せ対応",
      project_id: null,
      actual_minutes: 0,
      is_leaf: true,
    },
  },
];

const states: { label: string; previewState: ManualSessionModalPreviewState }[] = [
  { label: "default", previewState: "default" },
  { label: "hover", previewState: "hover" },
  { label: "focus", previewState: "focus" },
  { label: "active", previewState: "active" },
  { label: "disabled", previewState: "disabled" },
  { label: "error", previewState: "error" },
  { label: "loading", previewState: "loading" },
  { label: "success", previewState: "success" },
];

function ManualSessionModalPreview() {
  return (
    <ToastProvider>
      <style>{`
        [data-preview-state="hover"] .preview-interactive {
          border-color: var(--color-rule-strong);
          box-shadow: var(--shadow-soft);
        }
        [data-preview-state="hover"] .preview-primary-btn {
          opacity: 0.9;
        }
        [data-preview-state="hover"] .preview-interactive.preview-secondary-btn {
          background: var(--color-paper-2);
        }
        [data-preview-state="focus"] .preview-interactive {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px var(--color-accent-soft);
        }
        [data-preview-state="focus"] .preview-primary-btn {
          box-shadow: 0 0 0 2px var(--color-accent-soft);
        }
        [data-preview-state="active"] .preview-interactive {
          background: var(--color-paper-2);
          transform: scale(0.99);
        }
        [data-preview-state="active"] .preview-primary-btn,
        [data-preview-state="active"] .preview-secondary-btn {
          transform: scale(0.98);
        }
      `}</style>

      <div
        className="mx-auto flex max-w-3xl flex-col gap-8 p-8"
        style={{ fontFamily: "var(--font-body)", color: "var(--color-ink)" }}
      >
        <header>
          <h1
            className="text-2xl font-medium"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ManualSessionModal — 8 states
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Hallmark component preview (non-production)
          </p>
        </header>

        {states.map(({ label, previewState }) => (
          <section key={previewState} className="flex flex-col gap-2">
            <h2
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--color-ink-muted)" }}
            >
              {label}
            </h2>
            <ManualSessionModal
              embedded
              previewState={previewState}
              placedTodos={previewState === "disabled" ? [] : mockTodos}
              onClose={noop}
              onSaved={noop}
            />
          </section>
        ))}
      </div>
    </ToastProvider>
  );
}

export default ManualSessionModalPreview;
