import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text } from "react-native";

import { RateEditor, useRateInput } from "../RateEditor";

function Harness({ onSubmit }: { onSubmit: (v: number) => void }) {
  const input = useRateInput(null);
  return (
    <>
      <RateEditor input={input} />
      <Pressable testID="submit" disabled={!input.parsed.ok} onPress={() => input.parsed.ok && onSubmit(input.parsed.value)}>
        <Text>保存</Text>
      </Pressable>
    </>
  );
}

describe("RateEditor", () => {
  test("shows a yen preview while typing and yields the parsed rate", async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId("rate-input"), "1,500");
    expect(screen.getByText("1日4時間を1か月")).toBeTruthy();
    expect(screen.getByText("25円")).toBeTruthy(); // 1 minute
    expect(screen.getByText("3,000円")).toBeTruthy(); // 2 hours
    await fireEvent.press(screen.getByTestId("submit"));
    expect(onSubmit).toHaveBeenCalledWith(1500);
  });

  test("invalid input shows an inline error and no preview", async () => {
    const onSubmit = jest.fn();
    await render(<Harness onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByTestId("rate-input"), "abc");
    expect(screen.getByText("半角数字で入力してください")).toBeTruthy();
    expect(screen.queryByText("1日2時間")).toBeNull();
    await fireEvent.press(screen.getByTestId("submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
