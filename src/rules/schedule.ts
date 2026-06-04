/**
 * Scheduled workflows that fire very frequently quietly add up — a job that
 * runs every 5 minutes fires 288 times a day. We estimate the interval from the
 * cron's minute/hour fields and flag anything tighter than the configured floor.
 */

import type { Config, Finding, Workflow } from "../types.js";
import type { Rule } from "./rule.js";

/** Best-effort estimate of how often a 5-field cron fires, in minutes. */
export function estimateCronIntervalMinutes(cron: string): number {
  const fields = cron.trim().split(/\s+/);
  if (fields.length < 5) return Infinity;
  const [minute, hour] = fields as [string, string, string, string, string];

  const stepOf = (field: string): number | null => {
    const m = /^\*\/(\d+)$/.exec(field);
    return m ? Number(m[1]) : null;
  };

  if (minute === "*") return 1;
  const minStep = stepOf(minute);
  if (minStep) return hour === "*" ? minStep : minStep; // every N minutes within active hours

  // A specific minute → at most once per hour at that minute.
  if (hour === "*") return 60;
  const hourStep = stepOf(hour);
  if (hourStep) return hourStep * 60;

  // Specific minute and hour → daily or rarer.
  return 24 * 60;
}

export const scheduleRule: Rule = {
  id: "frequent-schedule",
  run(workflow: Workflow, config: Config): Finding[] {
    const out: Finding[] = [];
    for (const trigger of workflow.triggers) {
      if (trigger.event !== "schedule" || !trigger.crons) continue;
      for (const cron of trigger.crons) {
        const interval = estimateCronIntervalMinutes(cron);
        if (interval < config.minScheduleMinutes) {
          const perDay = Math.round((24 * 60) / interval);
          out.push({
            rule: "frequent-schedule",
            severity: "warning",
            title: `Schedule runs every ~${interval} min`,
            message: `Cron "${cron}" fires roughly ${perDay}×/day — each run bills full runner time.`,
            line: trigger.line,
            waste: 20,
            fix: `Run less often (≥ every ${config.minScheduleMinutes} min) unless the frequency is truly required.`,
          });
        }
      }
    }
    return out;
  },
};
