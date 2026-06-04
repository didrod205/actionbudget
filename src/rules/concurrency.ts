/**
 * Without a `concurrency` group that cancels in-progress runs, every push to an
 * open PR starts a fresh pipeline while the previous one keeps burning minutes.
 * For PR/push-triggered workflows this is one of the biggest, easiest savings.
 */

import type { Finding, Workflow } from "../types.js";
import { eventNames, type Rule } from "./rule.js";

const CANCELLABLE = ["push", "pull_request", "pull_request_target"];

export const concurrencyRule: Rule = {
  id: "no-concurrency",
  run(workflow: Workflow): Finding[] {
    const events = eventNames(workflow);
    const relevant = CANCELLABLE.some((e) => events.has(e));
    if (!relevant) return [];

    const line = workflow.triggers[0]?.line;

    if (!workflow.hasConcurrency) {
      return [
        {
          rule: "no-concurrency",
          severity: "warning",
          title: "No concurrency group — superseded runs keep running",
          message:
            "This push/PR workflow has no top-level `concurrency`, so a new commit doesn't cancel the previous run.",
          line,
          waste: 30,
          fix: "Add:\nconcurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true",
        },
      ];
    }

    if (workflow.cancelInProgress !== true) {
      return [
        {
          rule: "no-cancel-in-progress",
          severity: "warning",
          title: "concurrency set, but cancel-in-progress is off",
          message: "A concurrency group exists but `cancel-in-progress` isn't true, so old runs still finish.",
          line,
          waste: 18,
          fix: "Set `cancel-in-progress: true` in the concurrency block.",
        },
      ];
    }

    return [];
  },
};
