// "1時間の価値" input. The conversions update as you type: the value demo of the app.
import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { parseRateInput, ratePreview, type RateParseResult } from "../domain/money";
import { Row, Section, T } from "../ui/components";
import { color, space, type } from "../ui/theme";

export function useRateInput(initial: number | null) {
  const [text, setText] = useState(initial ? String(initial) : "");
  const [touched, setTouched] = useState(false);
  const parsed: RateParseResult = parseRateInput(text);
  return {
    text,
    parsed,
    touched,
    setText: (t: string) => {
      setText(t);
      setTouched(true);
    },
  };
}

export function RateEditor({ input, autoFocus }: { input: ReturnType<typeof useRateInput>; autoFocus?: boolean }) {
  const { text, parsed, touched, setText } = input;
  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: space.xs }}>
        <T variant="footnote" color={color.secondaryLabel} nativeID="rate-label">
          1時間あたり（円）
        </T>
        <View style={s.inputRow}>
          <T variant="display" color={color.tertiaryLabel}>
            ¥
          </T>
          <TextInput
            testID="rate-input"
            value={text}
            onChangeText={setText}
            placeholder="1500"
            placeholderTextColor={color.placeholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={9}
            autoFocus={autoFocus}
            style={s.input}
            accessibilityLabel="1時間あたりの金額（円）"
            accessibilityLabelledBy="rate-label"
          />
        </View>
        <View style={[s.underline, { backgroundColor: parsed.ok || !touched ? color.accent : color.destructive }]} />
        {!parsed.ok && touched ? (
          <T variant="footnote" color={color.destructive} accessibilityLiveRegion="polite">
            {parsed.error}
          </T>
        ) : (
          <T variant="footnote" color={color.secondaryLabel}>
            実際の時給でなくてかまいません。
          </T>
        )}
      </View>

      {parsed.ok ? (
        <Section>
          {ratePreview(parsed.value).map((l) => (
            <Row key={l.label} title={l.label} value={l.yen} valueColor={color.label} />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  inputRow: { flexDirection: "row", alignItems: "baseline", gap: space.s },
  input: { ...type.display, flex: 1, color: color.label, paddingVertical: 0 },
  underline: { height: 2, borderRadius: 1 },
});
