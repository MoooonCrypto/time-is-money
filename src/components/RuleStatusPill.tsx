import React from "react";

import type { RuleStatus } from "../domain/rules";
import { StatusPill } from "../ui/components";

/** Status as icon + text (never color alone). */
export function RuleStatusPill({ status, paused }: { status: RuleStatus; paused: boolean }) {
  if (paused) return <StatusPill tone="warning" icon="pause.fill" label="停止中" />;
  if (status.notYetEffective) return <StatusPill tone="neutral" icon="clock" label="明日から" />;
  if (status.lockedNow) return <StatusPill tone="destructive" icon="lock.fill" label="ロック中" />;
  if (status.limitToday) return <StatusPill tone="success" icon="checkmark" label="利用可" />;
  return <StatusPill tone="neutral" icon="minus" label="今日は制限なし" />;
}
