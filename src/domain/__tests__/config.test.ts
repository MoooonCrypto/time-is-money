import { defaultConfig, parseConfig, serializeConfig } from "../config";

describe("config", () => {
  test("round-trips", () => {
    const c = {
      ...defaultConfig(),
      hourlyRateYen: 1500,
      onboardingCompleted: true,
      rules: [
        {
          id: "r1",
          name: "X",
          versions: [
            {
              versionId: "v1",
              effectiveFrom: "2026-11-22",
              deleted: false,
              selectionId: "s1",
              mode: "weekly" as const,
              dailyLimitMinutes: null,
              weeklyLimitMinutes: [null, 20, 20, 20, 20, 20, 60],
            },
          ],
        },
      ],
    };
    expect(parseConfig(serializeConfig(c, { allowDebug: false }))).toEqual(c);
  });

  test("tolerates garbage", () => {
    expect(parseConfig("not json")).toEqual(defaultConfig());
    expect(parseConfig(null)).toEqual(defaultConfig());
    expect(parseConfig('{"rules":[{"id":1}],"hourlyRateYen":-5}')).toEqual(defaultConfig());
  });

  test("normalizes weekly arrays to 7 entries and drops non-positive limits", () => {
    const c = parseConfig(
      JSON.stringify({
        rules: [
          {
            id: "r",
            name: "n",
            versions: [{ versionId: "v", effectiveFrom: "2026-01-01", mode: "weekly", weeklyLimitMinutes: [0, 10] }],
          },
        ],
      }),
    );
    expect(c.rules[0].versions[0].weeklyLimitMinutes).toEqual([null, 10, null, null, null, null, null]);
  });

  test("debug flag is stripped unless allowed", () => {
    const c = { ...defaultConfig(), debugShortThresholds: true };
    expect(JSON.parse(serializeConfig(c, { allowDebug: false })).debugShortThresholds).toBeUndefined();
    expect(JSON.parse(serializeConfig(c, { allowDebug: true })).debugShortThresholds).toBe(true);
  });
});
