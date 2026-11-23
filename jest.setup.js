/* eslint-env jest */
// Native-only modules used by the UI layer.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

jest.mock("@react-native-segmented-control/segmented-control", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  // Renders each segment as a pressable label so tests can select by text.
  const Segmented = ({ values, onChange, testID }) =>
    React.createElement(
      View,
      { testID },
      values.map((v, i) =>
        React.createElement(
          Pressable,
          { key: v, onPress: () => onChange({ nativeEvent: { selectedSegmentIndex: i } }) },
          React.createElement(Text, null, v),
        ),
      ),
    );
  return { __esModule: true, default: Segmented };
});

jest.mock("expo-symbols", () => ({ SymbolView: () => null }));
jest.mock("expo-haptics", () => ({
  selectionAsync: () => Promise.resolve(),
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
}));
