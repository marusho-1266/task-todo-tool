import { describe, expect, it } from "vitest";
import {
  blocksOverlap,
  getTimelineMaxMinutes,
  mergeCarryOverByTask,
  planCarryOverPlacements,
  workDayStartMinutes,
} from "@/lib/prepare-tomorrow";

function carryItem(
  todoId: string,
  taskId: string,
  plannedMinutes: number,
  title: string,
) {
  return {
    todoId,
    taskId,
    plannedMinutes,
    title,
    sourceTodoIds: [todoId],
  };
}

describe("workDayStartMinutes", () => {
  it("converts 09:00 to timeline-relative minutes", () => {
    expect(workDayStartMinutes("09:00")).toBe(180);
  });

  it("accepts single-digit hours", () => {
    expect(workDayStartMinutes("9:00")).toBe(180);
  });

  it("defaults minutes to 0 when the segment is empty", () => {
    expect(workDayStartMinutes("10:")).toBe(240);
  });

  it("throws for malformed input", () => {
    expect(() => workDayStartMinutes("invalid")).toThrow(/expected "H:MM"/);
    expect(() => workDayStartMinutes("aa:bb")).toThrow(/must be numbers/);
  });
});

describe("blocksOverlap", () => {
  it("detects overlapping intervals", () => {
    expect(
      blocksOverlap(
        { startMinutes: 180, durationMinutes: 30 },
        { startMinutes: 200, durationMinutes: 30 },
      ),
    ).toBe(true);
  });

  it("returns false for adjacent non-overlapping blocks", () => {
    expect(
      blocksOverlap(
        { startMinutes: 180, durationMinutes: 30 },
        { startMinutes: 210, durationMinutes: 30 },
      ),
    ).toBe(false);
  });
});

describe("mergeCarryOverByTask", () => {
  it("sums planned minutes for the same task", () => {
    const merged = mergeCarryOverByTask([
      { id: "a1", taskId: "t1", plannedMinutes: 90, title: "Same" },
      { id: "a2", taskId: "t1", plannedMinutes: 120, title: "Same" },
      { id: "b1", taskId: "t2", plannedMinutes: 30, title: "Other" },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      taskId: "t1",
      plannedMinutes: 210,
      sourceTodoIds: ["a1", "a2"],
      todoId: "a1",
    });
    expect(merged[1]).toMatchObject({
      taskId: "t2",
      plannedMinutes: 30,
      sourceTodoIds: ["b1"],
    });
  });
});

describe("planCarryOverPlacements", () => {
  const workStart = 180;

  it("places items sequentially from work start", () => {
    const plan = planCarryOverPlacements(
      [
        carryItem("a", "t1", 30, "A"),
        carryItem("b", "t2", 30, "B"),
      ],
      [],
      workStart,
    );

    expect(plan.placements).toHaveLength(2);
    expect(plan.placements[0].scheduledStartMinutes).toBe(180);
    expect(plan.placements[1].scheduledStartMinutes).toBe(210);
    expect(plan.overflow).toHaveLength(0);
  });

  it("keeps original planned_minutes for long todos (D2)", () => {
    const plan = planCarryOverPlacements(
      [carryItem("a", "t1", 60, "Long")],
      [],
      workStart,
    );

    expect(plan.placements[0].plannedMinutes).toBe(60);
    expect(plan.placements[0].scheduledStartMinutes).toBe(180);
  });

  it("skips occupied slots from existing blocks", () => {
    const plan = planCarryOverPlacements(
      [carryItem("a", "t1", 30, "A")],
      [{ startMinutes: 180, durationMinutes: 30 }],
      workStart,
    );

    expect(plan.placements[0].scheduledStartMinutes).toBe(210);
  });

  it("reports overflow when no slot fits (P2-04)", () => {
    const max = getTimelineMaxMinutes();
    const existing = [{ startMinutes: workStart, durationMinutes: max - workStart }];

    const plan = planCarryOverPlacements(
      [carryItem("a", "t1", 30, "Overflow")],
      existing,
      workStart,
    );

    expect(plan.placements).toHaveLength(0);
    expect(plan.overflow).toEqual([{ todoId: "a", title: "Overflow" }]);
  });

  it("does not split multiple items when timeline is tight", () => {
    const max = getTimelineMaxMinutes();
    const lastStart = max - 30;

    const plan = planCarryOverPlacements(
      [
        carryItem("a", "t1", 30, "Fits"),
        carryItem("b", "t2", 30, "No room"),
      ],
      [],
      lastStart,
    );

    expect(plan.placements).toHaveLength(1);
    expect(plan.overflow).toHaveLength(1);
    expect(plan.overflow[0].title).toBe("No room");
  });
});
