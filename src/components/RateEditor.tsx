// Hourly-rate input with a live yen preview. Controlled: parents own the
// primary action (pinned in the thumb zone).
import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { formatYen, parseRateInput, ratePreview, type RateParseResult } from "../domain/money";
import { Icon, Row, Section, T } from "../ui/components";
import { color, radius, space } from "../ui/theme";

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

export function RateEditor({
  input,
  autoFocus,
}: {
  input: ReturnType<typeof useRateInput>;
  autoFocus?: boolean;
}) {
  const { text, parsed, touched, setText } = input;
  return (
    <View style={{ gap: space.xl }}>
      <View style={s.field}>
        <View style={s.inputRow}>
          <T variant="title1" color={color.secondaryLabel}>
            ¥
          </T>
          <TextInput
            testID="rate-input"
            value={text}
            onChangeText={setText}
            placeholder="1,500"
            placeholderTextColor={color.placeholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={9}
            autoFocus={autoFocus}
            style={s.input}
            accessibilityLabel="時間の単価（円／時間）"
          />
          <T variant="headline" color={color.secondaryLabel}>
            ／時間
          </T>
        </View>
        {!parsed.ok && touched ? (
          <View style={s.errorRow} accessibilityLiveRegion="polite">
            <Icon name="exclamationmark.circle.fill" size={15} tint={color.destructive} />
            <T variant="footnote" color={color.destructive}>
              {parsed.error}
            </T>
          </View>
        ) : (
          <T variant="footnote" color={color.secondaryLabel} align="center">
            実際の給与でなくて大丈夫。「自分の1時間の価値」で決めましょう。
          </T>
        )}
      </View>

      {parsed.ok ? (
        <Section header={`円換算プレビュー（${formatYen(parsed.value)}円／時間）`}>
          {ratePreview(parsed.value).map((l) => (
            <Row key={l.label} title={l.label} value={l.yen} />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  field: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
    paddingVertical: space.xl,
    paddingHorizontal: space.l,
    gap: space.m,
  },
  inputRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: space.s },
  input: {
    minWidth: 120,
    fontSize: 48,
    fontWeight: "700",
    color: color.label,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    paddingVertical: 0,
  },
  errorRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
