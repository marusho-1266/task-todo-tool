"use client";

import { useEffect, useState } from "react";
import { stopSession } from "@/app/actions/sessions";
import { formatElapsed } from "@/lib/time";
import type { WorkSession } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

type Props = {
  session: WorkSession;
  onStopped?: () => void;
};

export function SessionBar({ session, onStopped }: Props) {
  const { showToast } = useToast();
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);

  const title = session.todos?.tasks?.title ?? "作業中";

  useEffect(() => {
    const start = new Date(session.started_at).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.started_at]);

  async function handleStop() {
    setStopping(true);
    const result = await stopSession(session.id);
    setStopping(false);
    if (!result.success) {
      showToast(result.error);
      return;
    }
    showToast("計測を停止しました", "success");
    onStopped?.();
  }

  return (
    <div
      className="border-b px-4 py-2.5"
      style={{
        background: "var(--color-accent-soft)",
        borderColor: "var(--color-rule)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full"
            style={{ background: "var(--color-accent)" }}
            aria-hidden
          />
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            計測中
          </span>
          <span
            className="truncate text-sm font-medium"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-body)" }}
          >
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <time
            className="tabular-nums text-lg font-medium tracking-tight"
            style={{
              color: "var(--color-accent)",
              fontFamily: "var(--font-mono)",
            }}
            dateTime={`PT${elapsed}S`}
          >
            {formatElapsed(elapsed)}
          </time>
          <button
            type="button"
            onClick={handleStop}
            disabled={stopping}
            className="rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-accent-ink)",
              fontFamily: "var(--font-body)",
            }}
          >
            {stopping ? "停止中…" : "停止"}
          </button>
        </div>
      </div>
    </div>
  );
}
