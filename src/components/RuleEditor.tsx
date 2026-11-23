// Create/edit one app limit (sheet). Inset-grouped form; Save pinned in the thumb zone.
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";

import type { AppConfig } from "../domain/config";
import { addDays, dayKey, formatDayKeyJa } from "../domain/dates";
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
import { Button, haptic, Icon, Row, Screen, Section, Segmented, T } from "../ui/components";
import { color, HIT, radius, space, type } from "../ui/theme";
import { SelectionLabel } from "./SelectionLabel";

const DEV_PRESETS = [1, 2, 3];
const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
/** Monday-first display order (data stays Sunday = 0). */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function RuleEditor({
  config,
  ruleId,
  onSave,
  children,
  saveLabel = "保存",
}: {
  config: AppConfig;
  ruleId: string | null;
  onSave: (result: SaveResult) => Promise<void>;
  /** Extra sections after the form (e.g. delete). */
  children?: React.ReactNode;
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
  const [problem, setProblem] = useState<string | null>(null);

  const error = validateDraft(draft);
  const timing = classifyChange(current, draft, relation);
  const tomorrowLabel = formatDayKeyJa(addDays(today, 1));

  const pick = async () => {
    setProblem(null);
    try {
      const res = await screenTime.pickApps(draft.selectionId, current?.selectionId ?? null);
      if (!res) return;
      setDraft((d) => ({ ...d, selectionId: res.selectionId }));
      setRelation(res.relation);
    } catch (e) {
      setProblem(`アプリを選べませんでした。スクリーンタイムの許可を確認してください。（${String(e)}）`);
    }
  };

  const save = async () => {
    if (error) return;
    setSaving(true);
    setProblem(null);
    try {
      const result = saveRule(config, ruleId, draft, relation, now);
      haptic.success();
      await onSave(result);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const setWeekday = (i: number, m: number | null) =>
    setDraft((d) => {
      const w = d.weeklyLimitMinutes.slice();
      w[i] = m;
      return { ...d, weeklyLimitMinutes: w };
    });

  return (
    <Screen
      grouped
      footer={
        <>
          {problem || error ? (
            <T variant="footnote" color={problem ? color.destructive : color.secondaryLabel} align="center" accessibilityLiveRegion="polite">
              {problem ?? error}
            </T>
          ) : null}
          <Button testID="rule-save" title={saveLabel} onPress={() => void save()} disabled={!!error} loading={saving} />
        </>
      }
    >
      <Section inset title="アプリ" footer="上限は制限ごとに別々に数えます。">
        {draft.selectionId ? (
          <View style={{ paddingHorizontal: space.l, paddingVertical: space.m }}>
            <SelectionLabel selectionId={draft.selectionId} />
          </View>
        ) : null}
        <Row inset testID="pick-apps" title={draft.selectionId ? "アプリを変更" : "アプリを選ぶ"} accent chevron onPress={() => void pick()} />
      </Section>

      <Section inset title="名前">
        <TextInput
          value={draft.name}
          onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
          placeholder="SNS"
          placeholderTextColor={color.placeholder}
          style={s.textInput}
          maxLength={30}
          accessibilityLabel="制限の名前"
          clearButtonMode="while-editing"
          returnKeyType="done"
        />
      </Section>

      <Section inset title="1日の上限">
        <View>
          <View style={{ padding: space.l, paddingBottom: draft.mode === "daily" ? space.s : space.l }}>
            <Segmented
              testID="mode-segmented"
              options={[
                { value: "daily", label: "毎日同じ" },
                { value: "weekly", label: "曜日別" },
              ]}
              value={draft.mode}
              onChange={(mode) => setDraft((d) => ({ ...d, mode }))}
            />
          </View>
          {draft.mode === "daily" ? (
            <View style={{ paddingBottom: space.l, gap: space.m }}>
              <View style={s.dailyValue}>
                <T variant="display" style={{ fontSize: 44, lineHeight: 50 }} accessibilityLabel={`1日の上限 ${draft.dailyLimitMinutes ? formatDuration(draft.dailyLimitMinutes) : "未設定"}`}>
                  {draft.dailyLimitMinutes ? formatDuration(draft.dailyLimitMinutes) : "未設定"}
                </T>
                <Stepper value={draft.dailyLimitMinutes} onChange={(m) => setDraft((d) => ({ ...d, dailyLimitMinutes: m }))} />
              </View>
              <PresetChips value={draft.dailyLimitMinutes} onChange={(m) => setDraft((d) => ({ ...d, dailyLimitMinutes: m }))} />
            </View>
          ) : (
            DISPLAY_ORDER.map((i) => {
              const m = draft.weeklyLimitMinutes[i];
              return (
                <View key={i}>
                  <View style={s.rowDivider} />
                  <View style={s.weekRow}>
                    <View style={{ flex: 1 }}>
                      <T variant="body">{WEEKDAY_NAMES[i]}</T>
                      <T variant="footnote" color={color.secondaryLabel} style={{ fontVariant: ["tabular-nums"] }}>
                        {m ? formatDuration(m) : "制限なし"}
                      </T>
                    </View>
                    {m ? <Stepper value={m} onChange={(v) => setWeekday(i, v)} /> : null}
                    <Switch
                      testID={`weekday-${i}-switch`}
                      accessibilityLabel={`${WEEKDAY_NAMES[i]}に上限を設定`}
                      value={m !== null}
                      onValueChange={(on) => {
                        haptic.selection();
                        setWeekday(i, on ? 30 : null);
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </Section>

      {rule && !error ? (
        <View style={s.timing}>
          <Icon name={timing === "immediate" ? "checkmark.circle" : "calendar"} size={18} tint={color.secondaryLabel} />
          <View style={{ flex: 1 }}>
            <T variant="subheadline" weight="600">
              {timing === "immediate" ? "今日から反映" : `${tomorrowLabel}から反映`}
            </T>
            <T variant="footnote" color={color.secondaryLabel}>
              {timing === "immediate"
                ? "上限を厳しくする変更は、すぐに反映されます。"
                : "上限を緩める変更は翌日からです。今日はいまの上限のままです。"}
            </T>
          </View>
        </View>
      ) : null}

      {children}
    </Screen>
  );
}

/** UIStepper-like control (−/＋), 5-minute steps (1 minute below 5 in development). */
export function Stepper({ value, onChange }: { value: number | null; onChange: (m: number) => void }) {
  const min = __DEV__ ? 1 : 5;
  const base = value ?? 30;
  const step = (dir: 1 | -1) => {
    const size = base <= 5 && __DEV__ ? 1 : 5;
    haptic.selection();
    onChange(Math.min(23 * 60 + 55, Math.max(min, base + dir * size)));
  };
  return (
    <View style={s.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel="減らす" onPress={() => step(-1)} style={s.stepHalf} hitSlop={4}>
        <Icon name="minus" size={15} tint={color.label} weight="semibold" />
      </Pressable>
      <View style={s.stepDivider} />
      <Pressable accessibilityRole="button" accessibilityLabel="増やす" onPress={() => step(1)} style={s.stepHalf} hitSlop={4}>
        <Icon name="plus" size={15} tint={color.label} weight="semibold" />
      </Pressable>
    </View>
  );
}

function PresetChips({ value, onChange }: { value: number | null; onChange: (m: number) => void }) {
  const presets: number[] = [...(__DEV__ ? DEV_PRESETS : []), ...LIMIT_PRESETS_MINUTES];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {presets.map((m) => {
        const active = value === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptic.selection();
              onChange(m);
            }}
            style={[s.chip, active && s.chipActive]}
          >
            <T variant="subheadline" weight={active ? "600" : "400"} color={active ? color.accent : color.label}>
              {formatDuration(m)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  textInput: { ...type.body, color: color.label, paddingHorizontal: space.l, minHeight: HIT + 6 },
  dailyValue: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.l },
  weekRow: { minHeight: HIT + 12, paddingHorizontal: space.l, paddingVertical: space.s, flexDirection: "row", alignItems: "center", gap: space.m },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: space.l },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: color.fill, borderRadius: 8, borderCurve: "continuous", height: 32 },
  stepHalf: { width: 47, height: 32, alignItems: "center", justifyContent: "center" },
  stepDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: color.separator },
  chips: { paddingHorizontal: space.l, gap: space.s },
  chip: { paddingHorizontal: 14, height: 34, justifyContent: "center", borderRadius: radius.control, borderCurve: "continuous", backgroundColor: color.fill },
  chipActive: { backgroundColor: color.accentSoft },
  timing: { flexDirection: "row", gap: space.m, paddingHorizontal: space.l, alignItems: "flex-start" },
});
