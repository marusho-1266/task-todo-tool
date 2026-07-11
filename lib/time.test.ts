import { describe, expect, it } from "vitest";
import { getNowTimelineMinutes } from "./time";

/** JST(UTC+9)の壁時計時刻から UTC の Date を作る */
function jst(hour: number, minute: number): Date {
  return new Date(Date.UTC(2026, 6, 10, hour - 9, minute, 0, 0));
}

describe("getNowTimelineMinutes", () => {
  it("JST 06:00 はタイムライン起点 0 分", () => {
    expect(getNowTimelineMinutes(jst(6, 0))).toBe(0);
  });

  it("JST 09:30 は 210 分", () => {
    expect(getNowTimelineMinutes(jst(9, 30))).toBe(210);
  });

  it("JST 21:59 は範囲内(959 分)", () => {
    expect(getNowTimelineMinutes(jst(21, 59))).toBe(959);
  });

  it("JST 05:59 は範囲外なので null", () => {
    expect(getNowTimelineMinutes(jst(5, 59))).toBeNull();
  });

  it("JST 22:00 は範囲外なので null", () => {
    expect(getNowTimelineMinutes(jst(22, 0))).toBeNull();
  });

  it("JST 00:30(深夜)は null", () => {
    expect(getNowTimelineMinutes(jst(0, 30))).toBeNull();
  });

  it("日跨ぎ: UTC 22:00 = JST 翌 07:00 は 60 分", () => {
    // UTC 2026-07-10 22:00 → JST 2026-07-11 07:00
    expect(getNowTimelineMinutes(new Date(Date.UTC(2026, 6, 10, 22, 0)))).toBe(
      60,
    );
  });
});
