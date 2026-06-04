/**
 * `actions/checkout` defaults to a fast shallow clone (`fetch-depth: 1`). Setting
 * `fetch-depth: 0` fetches the *entire* history — sometimes needed (release
 * notes, blame), but on a big repo it's a slow, heavy step worth a second look.
 */

import type { Finding, Workflow } from "../types.js";
import { usesAction, type Rule } from "./rule.js";

export const checkoutRule: Rule = {
  id: "full-history-checkout",
  run(workflow: Workflow): Finding[] {
    const out: Finding[] = [];
    for (const job of workflow.jobs) {
      for (const step of job.steps) {
        if (!usesAction(step.uses, "actions/checkout")) continue;
        if (step.with["fetch-depth"] === "0") {
          out.push({
            rule: "full-history-checkout",
            severity: "info",
            job: job.id,
            title: "checkout fetches full git history (fetch-depth: 0)",
            message: `Job "${job.id}" clones the entire history, which is slow on large repos.`,
            line: step.line,
            waste: 5,
            fix: "Drop `fetch-depth: 0` unless a step truly needs full history.",
          });
        }
      }
    }
    return out;
  },
};
