"use server";

import { createClient } from "@/lib/supabase/server";
import { TIMELINE_START_HOUR, TIMELINE_END_HOUR, JST_OFFSET_MS } from "@/lib/time";
import type { CalendarEvent } from "@/lib/types";

type GCalEvent = {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

type GCalResponse = {
  items?: GCalEvent[];
  error?: { message: string };
};

export async function fetchCalendarEvents(
  dateStr: string,
): Promise<CalendarEvent[] | null> {
  const supabase = await createClient();

  // getUser() でサーバーサイド認証検証（Cookie改ざん対策）
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;
  if (!providerToken) return [];

  const timeMin = new Date(`${dateStr}T${String(TIMELINE_START_HOUR).padStart(2, "0")}:00:00+09:00`).toISOString();
  const timeMax = new Date(`${dateStr}T${String(TIMELINE_END_HOUR).padStart(2, "0")}:00:00+09:00`).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
  });

  let data: GCalResponse;
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${providerToken}` }, cache: "no-store" },
    );
    if (!res.ok) {
      // 401/トークン失効などの一時的な取得失敗は null を返し、呼び出し側でのキャッシュを避ける
      console.error("[google-calendar] API error:", res.status);
      return null;
    }
    data = (await res.json()) as GCalResponse;
  } catch {
    return null;
  }

  const items = data.items ?? [];
  const startOfDay = TIMELINE_START_HOUR * 60;

  return items
    .filter((e) => !e.start.date)
    .map((e) => {
      const startDt = new Date(e.start.dateTime!);
      const endDt = new Date(e.end.dateTime!);
      const jstOffsetMinutes = JST_OFFSET_MS / 60_000;
      const utcMinutes = startDt.getUTCHours() * 60 + startDt.getUTCMinutes();
      const startMinutes = (utcMinutes + jstOffsetMinutes) % (24 * 60) - startOfDay;
      const durationMinutes = Math.round(
        (endDt.getTime() - startDt.getTime()) / 60000,
      );
      return {
        id: e.id,
        title: e.summary ?? "(タイトルなし)",
        startMinutes,
        durationMinutes,
        isAllDay: false,
      };
    });
}
