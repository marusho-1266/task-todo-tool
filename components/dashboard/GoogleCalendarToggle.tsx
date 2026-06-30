"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gcal-enabled";

type Props = {
  hasProviderToken: boolean;
  onChange: (enabled: boolean) => void;
};

export function GoogleCalendarToggle({ hasProviderToken, onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored === "true";
    setEnabled(initial);
    setMounted(true);
    onChange(initial);
  }, []);

  if (!hasProviderToken || !mounted) return null;

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    onChange(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 shadow-sm hover:bg-zinc-50"
    >
      <span
        className={`inline-block h-3 w-3 rounded-full border ${enabled ? "border-blue-500 bg-blue-500" : "border-zinc-300 bg-white"}`}
      />
      Googleカレンダー
    </button>
  );
}
