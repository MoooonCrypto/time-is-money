// Opened from usage notifications (range=today).
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";

import type { UsageRange } from "../../modules/screen-time";
import { RANGE_OPTIONS, UsageReport } from "../components/UsageReport";
import { Screen, Segmented } from "../ui/components";

export default function Stats() {
  const params = useLocalSearchParams<{ range?: string }>();
  const initial: UsageRange = params.range === "week" || params.range === "total" ? params.range : "today";
  const [range, setRange] = useState<UsageRange>(initial);
  return (
    <Screen>
      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      <UsageReport range={range} />
    </Screen>
  );
}
