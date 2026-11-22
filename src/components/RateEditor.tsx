import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { formatYen, parseRateInput, ratePreview } from "../domain/money";
import { Button, Card, colors, Small } from "./ui";

export function RateEditor({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: number | null;
  submitLabel: string;
  onSubmit: (rate: number) => void | Promise<void>;
}) {
  const [text, setText] = useState(initial ? String(initial) : "");
  const parsed = parseRateInput(text);
  const [touched, setTouched] = useState(false);

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Small>時間の単価（円／時間）</Small>
        <View style={s.inputRow}>
          <TextInput
            testID="rate-input"
            value={text}
            onChangeText={(t) => {
              setText(t);
              setTouched(true);
            }}
            placeholder="1500"
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={9}
            style={s.input}
            accessibilityLabel="時間の単価（円／時間）"
          />
          <Text style={s.unit}>円／時間</Text>
        </View>
        <Small>実際の給与である必要はありません。「自分の1時間はこのくらいの価値」と思う金額で大丈夫です。あとから変更できます。</Small>
        {!parsed.ok && touched && <Text style={s.error}>{parsed.error}</Text>}
      </Card>

      {parsed.ok && (
        <Card>
          <Small>円換算プレビュー（{formatYen(parsed.value)}円／時間）</Small>
          {ratePreview(parsed.value).map((l) => (
            <View key={l.label} style={s.previewRow}>
              <Text style={s.previewLabel}>{l.label}</Text>
              <Text style={s.previewYen}>{l.yen}</Text>
            </View>
          ))}
        </Card>
      )}

      <Button
        testID="rate-submit"
        title={submitLabel}
        disabled={!parsed.ok}
        onPress={() => {
          if (parsed.ok) void onSubmit(parsed.value);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    color: colors.ink,
    borderBottomWidth: 2,
    borderColor: colors.gold,
    paddingVertical: 6,
  },
  unit: { fontSize: 16, color: colors.sub },
  error: { color: colors.danger, fontSize: 13 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  previewLabel: { fontSize: 15, color: colors.ink },
  previewYen: { fontSize: 15, fontWeight: "700", color: colors.ink },
});
