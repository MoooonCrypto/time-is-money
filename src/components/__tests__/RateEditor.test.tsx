import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { RateEditor } from "../RateEditor";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe("RateEditor", () => {
  test("shows a yen preview while typing and submits the parsed rate", async () => {
    const onSubmit = jest.fn();
    await render(<RateEditor initial={null} submitLabel="次へ" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId("rate-input"), "1,500");
    expect(screen.getByText("円換算プレビュー（1,500円／時間）")).toBeTruthy();
    expect(screen.getByText("25円")).toBeTruthy(); // 1 minute
    expect(screen.getByText("3,000円")).toBeTruthy(); // 2 hours
    await fireEvent.press(screen.getByTestId("rate-submit"));
    expect(onSubmit).toHaveBeenCalledWith(1500);
  });

  test("invalid input disables submit and shows an error", async () => {
    const onSubmit = jest.fn();
    await render(<RateEditor initial={null} submitLabel="次へ" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId("rate-input"), "abc");
    expect(screen.getByText("半角数字で入力してください")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("rate-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
