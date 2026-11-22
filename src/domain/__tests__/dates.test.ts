import { addDays, dayKey, formatDayKeyJa, weekdayOfKey, weekRange } from "../dates";

describe("dates", () => {
  test("dayKey is local yyyy-MM-dd", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  test("addDays crosses month/year", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("weeks run Sunday..Saturday", () => {
    // 2026-11-22 is a Sunday
    expect(weekdayOfKey("2026-11-22")).toBe(0);
    const wed = weekRange(new Date(2026, 10, 25, 12));
    expect(dayKey(wed.start)).toBe("2026-11-22");
    expect(dayKey(wed.end)).toBe("2026-11-29");
    const sat = weekRange(new Date(2026, 10, 28, 23, 59));
    expect(dayKey(sat.start)).toBe("2026-11-22");
    const sun = weekRange(new Date(2026, 10, 29, 0, 0));
    expect(dayKey(sun.start)).toBe("2026-11-29");
  });

  test("Japanese label", () => {
    expect(formatDayKeyJa("2026-11-23")).toBe("11/23(月)");
  });
});
