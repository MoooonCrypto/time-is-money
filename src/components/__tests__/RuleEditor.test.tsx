import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { defaultConfig } from "../../domain/config";
import { saveRule } from "../../domain/rules";
import { RuleEditor } from "../RuleEditor";

const mockPick = jest.fn();
jest.mock("../../native/screenTime", () => ({
  screenTime: {
    kind: "mock",
    pickApps: (...args: unknown[]) => mockPick(...args),
    getSelectionSummary: () => ({ applicationCount: 1, categoryCount: 0, webDomainCount: 0 }),
  },
}));

describe("RuleEditor", () => {
  beforeEach(() => mockPick.mockReset());

  test("new rule: pick an app, choose a preset, save immediately", async () => {
    mockPick.mockResolvedValue({ selectionId: "sel1", applicationCount: 1, categoryCount: 0, webDomainCount: 0, relation: null });
    const onSave = jest.fn().mockResolvedValue(undefined);
    await render(<RuleEditor config={defaultConfig()} ruleId={null} onSave={onSave} />);
    expect(screen.getByText("制限するアプリを選んでください")).toBeTruthy(); // inline validation
    await fireEvent.press(screen.getByText("アプリを選ぶ"));
    await waitFor(() => expect(screen.getByText("アプリ1件")).toBeTruthy());
    await fireEvent.press(screen.getByText("20分"));
    await fireEvent.press(screen.getByTestId("rule-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const result = onSave.mock.calls[0][0];
    expect(result.timing).toBe("immediate");
    expect(result.config.rules[0].versions[0]).toMatchObject({ selectionId: "sel1", mode: "daily", dailyLimitMinutes: 20 });
  });

  test("raising an existing limit is announced as next-day", async () => {
    const now = new Date();
    const created = saveRule(
      defaultConfig(),
      null,
      { name: "X", selectionId: "s", mode: "daily", dailyLimitMinutes: 20, weeklyLimitMinutes: Array(7).fill(null) },
      null,
      now,
    );
    const onSave = jest.fn().mockResolvedValue(undefined);
    await render(<RuleEditor config={created.config} ruleId={created.ruleId} onSave={onSave} />);
    expect(screen.getByText("今日から反映")).toBeTruthy();
    await fireEvent.press(screen.getByText("1時間"));
    expect(screen.getByText(/から反映$/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("rule-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].timing).toBe("nextDay");
  });

  test("weekly mode allows 制限なし per weekday", async () => {
    mockPick.mockResolvedValue({ selectionId: "sel1", applicationCount: 1, categoryCount: 0, webDomainCount: 0, relation: null });
    const onSave = jest.fn().mockResolvedValue(undefined);
    await render(<RuleEditor config={defaultConfig()} ruleId={null} onSave={onSave} />);
    await fireEvent.press(screen.getByText("アプリを選ぶ"));
    await waitFor(() => expect(screen.getByText("アプリ1件")).toBeTruthy());
    await fireEvent.press(screen.getByText("曜日別"));
    // Turn off Sunday (index 0) -> 制限なし
    await fireEvent(screen.getByTestId("weekday-0-switch"), "valueChange", false);
    expect(screen.getByText("制限なし")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("rule-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const v = onSave.mock.calls[0][0].config.rules[0].versions[0];
    expect(v.mode).toBe("weekly");
    expect(v.weeklyLimitMinutes[0]).toBeNull();
    expect(v.weeklyLimitMinutes[1]).toBe(30);
  });
});
