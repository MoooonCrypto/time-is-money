// Create/edit one app limit. Presented as a sheet (scoped task, HIG 7.3);
// the primary "保存" action is pinned at the bottom (thumb zone, HIG 1.3).
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";

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
import { color, HIT, radius, space } from "../ui/theme";
import { SelectionLabel } from "./SelectionLabel";

const DEV_PRESETS = [1, 2, 3];
const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
/** Monday-first display order (data stays Sunday = 0). */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function RuleEditor({
  config,
  ruleId,
  onSave,
  footerExtra,
  children,
  saveLabel = "保存",
}: {
  config: AppConfig;
  ruleId: string | null;
  onSave: (result: SaveResult) => Promise<void>;
  /** Extra content under the pinned save button. */
  footerExtra?: React.ReactNode;
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
      haptic.success();
      await onSave(result);
    } catch (e) {
      Alert.alert("保存できませんでした", e instanceof Error ? e.message : String(e));
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
      footer={
        <>
          {error ? (
            <View style={s.inlineError}>
              <Icon name="info.circle" size={14} tint={color.secondaryLabel} />
              <T variant="footnote" color={color.secondaryLabel}>
                {error}
              </T>
            </View>
          ) : null}
          <Button testID="rule-save" title={saveLabel} onPress={() => void save()} disabled={!!error} loading={saving} />
          {footerExtra}
        </>
      }
    >
      <Section header="制限するアプリ" footer="上限はこの制限ごとに独立して数えます。ほかの制限のアプリはロックされません。">
        {draft.selectionId ? (
          <View style={s.selectionBox}>
            <SelectionLabel selectionId={draft.selectionId} />
          </View>
        ) : null}
        <Row
          testID="pick-apps"
          title={draft.selectionId ? "アプリを変更" : "アプリを選ぶ"}
          icon="square.grid.2x2.fill"
          iconBg={color.info}
          tint={color.accent}
          chevron
          onPress={() => void pick()}
        />
      </Section>

      <Section header="名前">
        <View style={s.textRow}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
            placeholder="例：SNS"
            placeholderTextColor={color.placeholder}
            style={s.textInput}
            maxLength={30}
            accessibilityLabel="制限の名前"
            clearButtonMode="while-editing"
          />
        </View>
      </Section>

      <Section header="1日の上限">
        <View style={s.segmentRow}>
          <Segmented
            testID="mode-segmented"
            options={[
              { value: "daily", label: "毎日固定" },
              { value: "weekly", label: "曜日別" },
            ]}
            value={draft.mode}
            onChange={(mode) => setDraft((d) => ({ ...d, mode }))}
          />
        </View>
        {draft.mode === "daily" ? (
          <View style={s.dailyBox}>
            <T variant="largeTitle" align="center" tabular accessibilityLabel={`1日の上限 ${draft.dailyLimitMinutes ? formatDuration(draft.dailyLimitMinutes) : "未設定"}`}>
              {draft.dailyLimitMinutes ? formatDuration(draft.dailyLimitMinutes) : "—"}
            </T>
            <View style={{ alignItems: "center" }}>
              <Stepper value={draft.dailyLimitMinutes} onChange={(m) => setDraft((d) => ({ ...d, dailyLimitMinutes: m }))} />
            </View>
            <PresetChips value={draft.dailyLimitMinutes} onChange={(m) => setDraft((d) => ({ ...d, dailyLimitMinutes: m }))} />
          </View>
        ) : (
          DISPLAY_ORDER.map((i) => {
            const m = draft.weeklyLimitMinutes[i];
            return (
              <View key={i} style={s.weekRow}>
                <View style={{ flex: 1 }}>
                  <T variant="body">{WEEKDAY_NAMES[i]}</T>
                  <T variant="subheadline" color={m ? color.label : color.secondaryLabel} tabular>
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
            );
          })
        )}
      </Section>

      {rule && !error ? (
        <View style={s.timing}>
          <Icon
            name={timing === "immediate" ? "bolt.fill" : "calendar.badge.clock"}
            size={20}
            tint={timing === "immediate" ? color.success : color.warning}
            mode="hierarchical"
          />
          <View style={{ flex: 1 }}>
            <T variant="headline">{timing === "immediate" ? "今日から反映" : `${tomorrowLabel}から反映`}</T>
            <T variant="footnote" color={color.secondaryLabel}>
              {timing === "immediate"
                ? "上限を厳しくする変更なので、すぐに反映されます。"
                : "上限を緩める変更（引き上げ・制限なし・アプリの除外）は翌日から反映されます。今日は現在の上限のままです。"}
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
    const next = Math.min(23 * 60 + 55, Math.max(min, base + dir * size));
    haptic.selection();
    onChange(next);
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
            <T variant="subheadline" weight="600" color={active ? color.onAccent : color.label}>
              {formatDuration(m)}
              {DEV_PRESETS.includes(m) ? " dev" : ""}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  selectionBox: { paddingHorizontal: space.l, paddingVertical: space.m },
  textRow: { paddingHorizontal: space.l, minHeight: HIT + 8, justifyContent: "center" },
  textInput: { fontSize: 17, color: color.label, paddingVertical: space.m },
  segmentRow: { padding: space.l, paddingBottom: space.s },
  dailyBox: { paddingBottom: space.l, gap: space.m },
  weekRow: {
    minHeight: HIT + 12,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.fill,
    borderRadius: 9,
    borderCurve: "continuous",
    height: 32,
  },
  stepHalf: { width: 47, height: 32, alignItems: "center", justifyContent: "center" },
  stepDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: color.separator },
  chips: { paddingHorizontal: space.l, gap: space.s },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  chipActive: { backgroundColor: color.accent },
  timing: {
    flexDirection: "row",
    gap: space.m,
    padding: space.l,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
  },
  inlineError: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
