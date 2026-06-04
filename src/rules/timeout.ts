/**
 * Job timeouts. A job with no `timeout-minutes` inherits GitHub's default of
 * **360 minutes** — so a hung test or a wedged process can quietly bill six
 * hours of runner time before it's killed.
 */

import type { Config, Finding, Workflow } from "../types.js";
import type { Rule } from "./rule.js";

export const timeoutRule: Rule = {
  id: "no-timeout",
  run(workflow: Workflow, config: Config): Finding[] {
    if (!config.requireTimeout) return [];
    const out: Finding[] = [];
    for (const job of workflow.jobs) {
      if (job.timeoutMinutes === undefined) {
        out.push({
          rule: "no-timeout",
          severity: "info",
          job: job.id,
          title: "Job has no timeout-minutes",
          message: `Job "${job.id}" can run up to GitHub's 360-minute default if it hangs.`,
          line: job.line,
          waste: 8,
          fix: "Add `timeout-minutes: 15` (or a sensible cap) to the job.",
        });
      }
    }
    return out;
  },
};
