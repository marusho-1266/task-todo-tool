import { describe, expect, it } from "vitest";
import {
  buildTimelineCsv,
  hasTimelineExportData,
} from "@/lib/timeline-csv";
import { datetimeFromMinutes } from "@/lib/time";
import type { BacklogProject, Todo, WorkSession } from "@/lib/types";

const date = "2026-06-09";

const projects: BacklogProject[] = [
  {
    id: "project-1",
    title: "Webリニューアル",
    is_system: false,
    color: null,
    status: "in_progress",
    description: null,
    category: null,
  },
];

const planTodo: Todo = {
  id: "todo-1",
  user_id: "user-1",
  task_id: "task-1",
  date,
  scheduled_start: datetimeFromMinutes(date, 180).toISOString(),
  planned_minutes: 30,
  status: "pending",
  is_ad_hoc: false,
  tasks: { id: "task-1", title: "設計レビュー", project_id: "project-1", actual_minutes: 0, is_leaf: true },
};

const actualSession: WorkSession = {
  id: "session-1",
  task_id: "task-1",
  todo_id: "todo-1",
  started_at: datetimeFromMinutes(date, 255).toISOString(),
  ended_at: datetimeFromMinutes(date, 285).toISOString(),
  duration_minutes: 30,
  source: "timer",
  label: null,
  todos: { id: "todo-1", tasks: { title: "設計レビュー", project_id: "project-1" } },
};

describe("buildTimelineCsv", () => {
  it("exports plan and actual rows with UTF-8 headers", () => {
    const csv = buildTimelineCsv(date, [planTodo], [actualSession], new Date(), projects);
    const lines = csv.split("\r\n");

    expect(lines[0]).toBe(
      "種別,日付,プロジェクト,タイトル,開始時刻,終了時刻,分数,Todo ID,セッションID,ステータス,ソース",
    );
    expect(lines[1]).toContain("計画,2026-06-09,Webリニューアル,設計レビュー");
    expect(lines[2]).toContain("実績,2026-06-09,Webリニューアル,設計レビュー");
    expect(lines[2]).toContain("session-1");
    expect(lines[2]).toContain("タイマー");
  });

  it("leaves project column blank when the task has no project", () => {
    const csv = buildTimelineCsv(date, [planTodo], [], new Date(), []);
    const dataLine = csv.split("\r\n")[1];

    expect(dataLine).toContain("計画,2026-06-09,,設計レビュー");
  });

  it("sorts rows by start time", () => {
    const csv = buildTimelineCsv(date, [planTodo], [actualSession]);
    const dataLines = csv.split("\r\n").slice(1);

    expect(dataLines[0]).toMatch(/^計画/);
    expect(dataLines[1]).toMatch(/^実績/);
  });

  it("escapes commas in titles", () => {
    const todoWithComma: Todo = {
      ...planTodo,
      tasks: {
        id: "task-2",
        title: "見積,レビュー",
        project_id: null,
        actual_minutes: 0,
        is_leaf: true,
      },
    };

    const csv = buildTimelineCsv(date, [todoWithComma], []);
    expect(csv).toContain('"見積,レビュー"');
  });

  it("uses session label for ad-hoc rows", () => {
    const adHocSession: WorkSession = {
      ...actualSession,
      label: "〇〇社からの問合せ",
      todos: { id: "todo-2", tasks: { title: "（割込記録）", project_id: null } },
    };

    const csv = buildTimelineCsv(date, [], [adHocSession]);
    expect(csv).toContain("実績,2026-06-09,,〇〇社からの問合せ");
  });

  it("excludes ad-hoc todos from plan rows", () => {
    const adHocTodo: Todo = {
      ...planTodo,
      id: "todo-adhoc",
      is_ad_hoc: true,
      tasks: { id: "task-bucket", title: "（割込記録）", project_id: null, actual_minutes: 0, is_leaf: true },
    };

    const csv = buildTimelineCsv(date, [adHocTodo], []);
    expect(csv.split("\r\n")).toHaveLength(1);
  });

  it("marks active sessions as 計測中 without end time", () => {
    const activeSession: WorkSession = {
      ...actualSession,
      started_at: datetimeFromMinutes(date, 180).toISOString(),
      ended_at: null,
      duration_minutes: null,
    };
    const now = datetimeFromMinutes(date, 240);

    const csv = buildTimelineCsv(date, [], [activeSession], now);
    expect(csv).toContain("計測中");
    expect(csv).toContain("実績,2026-06-09,,設計レビュー,09:00,,60");
  });
});

describe("hasTimelineExportData", () => {
  it("returns false when there is nothing on the timeline", () => {
    expect(hasTimelineExportData([], [])).toBe(false);
    expect(
      hasTimelineExportData(
        [{ ...planTodo, scheduled_start: null }],
        [],
      ),
    ).toBe(false);
  });

  it("returns true when plans or sessions exist", () => {
    expect(hasTimelineExportData([planTodo], [])).toBe(true);
    expect(hasTimelineExportData([], [actualSession])).toBe(true);
  });
});
