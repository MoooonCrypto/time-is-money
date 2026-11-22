import {
  formatDuration,
  formatYen,
  parseRateInput,
  ratePreview,
  shieldSubtitle,
  usageNotificationBody,
  USAGE_THRESHOLD_HOURS,
  yenFor,
} from "../money";

describe("money", () => {
  test("yen conversion uses the hourly rate", () => {
    expect(yenFor(1500, 60)).toBe(1500);
    expect(yenFor(1500, 240)).toBe(6000);
    expect(yenFor(1000, 1)).toBe(17); // 16.67 rounds
    expect(yenFor(1, 29)).toBe(0);
  });

  test("formats yen with thousands separators", () => {
    expect(formatYen(0)).toBe("0");
    expect(formatYen(999)).toBe("999");
    expect(formatYen(6000)).toBe("6,000");
    expect(formatYen(1234567)).toBe("1,234,567");
  });

  test("notification text shows the cumulative amount (spec example)", () => {
    expect(usageNotificationBody(1500, 4)).toBe("今日は6,000円分／4時間をスマホに浪費しました。");
    // 6h at 1,500 = 9,000 (cumulative, not the 2h delta of 3,000)
    expect(usageNotificationBody(1500, 6)).toBe("今日は9,000円分／6時間をスマホに浪費しました。");
    expect(usageNotificationBody(null, 2)).toContain("2時間");
  });

  test("thresholds are every 2 hours up to 24", () => {
    expect([...USAGE_THRESHOLD_HOURS]).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
  });

  test("shield subtitle matches the spec example and works without limit", () => {
    expect(shieldSubtitle(20)).toBe("今日の利用枠20分を使い切りました。明日また使えます。");
    expect(shieldSubtitle(90)).toBe("今日の利用枠1時間30分を使い切りました。明日また使えます。");
    expect(shieldSubtitle(null)).toBe("今日の利用枠を使い切りました。明日また使えます。");
  });

  test("duration formatting", () => {
    expect(formatDuration(5)).toBe("5分");
    expect(formatDuration(60)).toBe("1時間");
    expect(formatDuration(125)).toBe("2時間5分");
  });

  test("rate input parsing", () => {
    expect(parseRateInput("1500")).toEqual({ ok: true, value: 1500 });
    expect(parseRateInput("1,500")).toEqual({ ok: true, value: 1500 });
    expect(parseRateInput("１５００円")).toEqual({ ok: true, value: 1500 });
    expect(parseRateInput("")).toMatchObject({ ok: false });
    expect(parseRateInput("0")).toMatchObject({ ok: false });
    expect(parseRateInput("12.5")).toMatchObject({ ok: false });
    expect(parseRateInput("abc")).toMatchObject({ ok: false });
    expect(parseRateInput("1000001")).toMatchObject({ ok: false });
  });

  test("rate preview", () => {
    const p = ratePreview(1500);
    expect(p[0]).toEqual({ label: "1分あたり", yen: "25円" });
    expect(p[2]).toEqual({ label: "2時間", yen: "3,000円" });
  });
});
