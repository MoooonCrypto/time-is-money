// Create/edit one app limit. Used by onboarding and 制限設定.
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { AppConfig } from "../domain/config";
import { addDays, dayKey, formatDayKeyJa, WEEKDAY_LABELS } from "../domain/dates";
import { formatDuration } from "../domain/money";
import {
  classifyChange,
  draftFromVersion,
  effectiveVersion,
  LIMIT_PRESETS_MINUTES,
  pendingVersions,
  saveRule,
  validateDraft,
  type RuleDraft,
  type SaveResult,
  type SelectionRelation,
} from "../domain/rules";
import { screenTime } from "../native/screenTime";
import { SelectionLabel } from "./SelectionLabel";
import { Banner, Button, Card, colors, H2, Row, Segmented, Small } from "./ui";

const DEV_PRESETS = [1, 2, 3];

export function RuleEditor({
  config,
  ruleId,
  onSave,
  onCancel,
  saveLabel = "保存",
}: {
  config: AppConfig;
  ruleId: string | null;
  onSave: (result: SaveResult) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const now = new Date();
  const today = dayKey(now);
  const rule = ruleId ? config.rules.find((r) => r.id === ruleId) ?? null : null;
  const current = rule ? effectiveVersion(rule, today) : null;
  // Start from the pending version if one exists so the user sees their latest intent.
  const pend = rule ? pendingVersions(rule, now) : [];
  const startFrom = pend.length > 0 && !pend[pend.length - 1].deleted ? pend[pend.length - 1] : current;

  const [draft, setDraft] = useState<RuleDraft>(() => draftFromVersion(rule?.name ?? "", startFrom));
  const [relation, setRelation] = useState<SelectionRelation | null>(null);
  const [saving, setSaving] = useState(false);

  const error = validateDraft(draft);
  const timing = classifyChange(current, draft, relation);
  const tomorrowLabel = formatDayKeyJa(addDays(today, 1));

  const pick = async () => {
    try {
      const res = await screenTime.pickApps(draft.selectionId, current?.selectionId ?? null);
      if (!res) return;
      setDraft((d) => ({ ...d, selectionId: res.selectionId }));
      setRelation(res.relation);
    } catch (e) {
      Alert.alert("アプリを選べませんでした", String(e));
    }
  };

  const save = async () => {
    if (error) return;
    setSaving(true);
    try {
      const result = saveRule(config, ruleId, draft, relation, now);
      await onSave(result);
    } catch (e) {
      Alert.alert("保存できませんでした", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <H2>名前</H2>
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder="例：SNS"
          style={s.textInput}
          maxLength={30}
        />
      </Card>

      <Card>
        <H2>制限するアプリ</H2>
        <SelectionLabel selectionId={draft.selectionId} />
        <Button kind="secondary" title={draft.selectionId ? "アプリを変更" : "アプリを選ぶ"} onPress={() => void pick()} />
        <Small>上限はこの制限ごとに独立して数えます（他の制限のアプリはロックされません）。</Small>
      </Card>

      <Card>
        <H2>1日の上限</H2>
        <Segmented
          options={[
            { value: "daily", label: "毎日固定" },
            { value: "weekly", label: "曜日別" },
          ]}
          value={draft.mode}
          onChange={(mode) => setDraft((d) => ({ ...d, mode }))}
        />
        {draft.mode === "daily" ? (
          <LimitPicker
            value={draft.dailyLimitMinutes}
            allowNone={false}
            onChange={(m) => setDraft((d) => ({ ...d, dailyLimitMinutes: m }))}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <View key={label} style={s.weekRow}>
                <Text style={s.weekLabel}>{label}</Text>
                <View style={{ flex: 1 }}>
                  <LimitPicker
                    compact
                    value={draft.weeklyLimitMinutes[i]}
                    allowNone
                    onChange={(m) =>
                      setDraft((d) => {
                        const w = d.weeklyLimitMinutes.slice();
                        w[i] = m;
                        return { ...d, weeklyLimitMinutes: w };
                      })
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {rule && !error && (
        <Banner tone={timing === "immediate" ? "ok" : "info"} title={timing === "immediate" ? "今日から反映" : `${tomorrowLabel}から反映`}>
          <Small>
            {timing === "immediate"
              ? "上限を厳しくする変更なので、すぐに反映されます。"
              : "上限を緩める変更（上限の引き上げ・制限なし・アプリの除外）は翌日から反映されます。今日は現在の上限のままです。"}
          </Small>
        </Banner>
      )}

      {error && <Small style={{ color: colors.danger }}>{error}</Small>}
      <Button title={saveLabel} onPress={() => void save()} disabled={!!error} loading={saving} />
      {onCancel && <Button kind="ghost" title="キャンセル" onPress={onCancel} />}
    </View>
  );
}

export function LimitPicker({
  value,
  onChange,
  allowNone,
  compact,
}: {
  value: number | null;
  onChange: (m: number | null) => void;
  allowNone: boolean;
  compact?: boolean;
}) {
  const presets: number[] = [...(__DEV__ ? DEV_PRESETS : []), ...LIMIT_PRESETS_MINUTES];
  const step = (delta: number) => {
    const base = value ?? 30;
    const next = Math.min(23 * 60 + 55, Math.max(__DEV__ ? 1 : 5, base + delta));
    onChange(next);
  };
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <Pressable accessibilityLabel="5分減らす" onPress={() => step(-5)} style={s.stepBtn}>
          <Text style={s.stepText}>−</Text>
        </Pressable>
        <Text style={[s.value, compact && { fontSize: 18 }]}>{value ? formatDuration(value) : "制限なし"}</Text>
        <Pressable accessibilityLabel="5分増やす" onPress={() => step(5)} style={s.stepBtn}>
          <Text style={s.stepText}>＋</Text>
        </Pressable>
      </Row>
      {!compact && (
        <View style={s.chips}>
          {presets.map((m) => (
            <Pressable key={m} onPress={() => onChange(m)} style={[s.chip, value === m && s.chipActive]}>
              <Text style={[s.chipText, value === m && s.chipTextActive]}>
                {formatDuration(m)}
                {DEV_PRESETS.includes(m) ? "(dev)" : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {allowNone && (
        <Pressable onPress={() => onChange(value === null ? 30 : null)} style={[s.chip, value === null && s.chipActive, { alignSelf: "flex-start" }]}>
          <Text style={[s.chipText, value === null && s.chipTextActive]}>制限なし</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  textInput: { fontSize: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, color: colors.ink },
  weekRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line, paddingTop: 8 },
  weekLabel: { width: 24, fontSize: 16, fontWeight: "700", color: colors.ink, paddingTop: 8 },
  stepBtn: { width: 44, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 22, color: colors.ink },
  value: { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "800", color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: "#fff" },
});
