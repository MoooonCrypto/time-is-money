import React from "react";
import { View } from "react-native";

import { NativeSelectionLabelView } from "../../modules/screen-time";
import { screenTime } from "../native/screenTime";
import { Small } from "./ui";

/** App icons (and names) of a stored selection, rendered natively via Label(token). */
export function SelectionLabel({
  selectionId,
  showTitles,
  maxIcons = 6,
}: {
  selectionId: string | null;
  showTitles?: boolean;
  maxIcons?: number;
}) {
  if (!selectionId) return <Small>アプリ未選択</Small>;
  if (NativeSelectionLabelView) {
    return (
      <View style={{ height: showTitles ? 28 * Math.min(maxIcons, 4) : 30 }}>
        <NativeSelectionLabelView
          style={{ flex: 1 }}
          selectionId={selectionId}
          maxIcons={maxIcons}
          showTitles={!!showTitles}
        />
      </View>
    );
  }
  const summary = screenTime.getSelectionSummary(selectionId);
  return <Small>{summary ? describeSummary(summary) : "選択済み"}</Small>;
}

export function describeSummary(s: { applicationCount: number; categoryCount: number; webDomainCount: number }): string {
  const parts: string[] = [];
  if (s.applicationCount) parts.push(`アプリ${s.applicationCount}件`);
  if (s.categoryCount) parts.push(`カテゴリ${s.categoryCount}件`);
  if (s.webDomainCount) parts.push(`Webサイト${s.webDomainCount}件`);
  return parts.join("・") || "未選択";
}
