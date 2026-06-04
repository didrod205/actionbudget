/**
 * Trigger waste:
 *  - `push` + `pull_request` with an unfiltered `push` runs CI **twice** for
 *    every commit on a PR branch (once for the push, once for the PR).
 *  - push/PR workflows with no `paths` filter run the full pipeline even for
 *    docs-only or unrelated changes.
 */

import type { Finding, Trigger, Workflow } from "../types.js";
import { type Rule } from "./rule.js";

function triggerFor(workflow: Workflow, event: string): Trigger | undefined {
  return workflow.triggers.find((t) => t.event === event);
}

export const triggersRule: Rule = {
  id: "duplicate-triggers",
  run(workflow: Workflow): Finding[] {
    const out: Finding[] = [];
    const push = triggerFor(workflow, "push");
    const pr = triggerFor(workflow, "pull_request");

    // Double-run: push has no branch filter, so it fires on PR source branches too.
    if (push && pr && !push.branches) {
      out.push({
        rule: "duplicate-triggers",
        severity: "warning",
        title: "push + pull_request run CI twice per PR commit",
        message:
          "Both `push` and `pull_request` fire, and `push` has no branch filter — so each PR commit triggers two full runs.",
        line: push.line,
        waste: 25,
        fix: "Limit push to your main branches:\non:\n  push:\n    branches: [main]\n  pull_request:",
      });
    }

    // No path filter on the heavy triggers.
    for (const t of [push, pr]) {
      if (t && !t.paths && !t.pathsIgnore) {
        out.push({
          rule: "no-path-filter",
          severity: "info",
          title: `\`${t.event}\` has no paths filter`,
          message: `\`${t.event}\` runs the whole workflow even for changes that can't affect it (docs, README…).`,
          line: t.line,
          waste: 6,
          fix: "Add `paths:` (or `paths-ignore:`) so unrelated changes skip CI.",
        });
      }
    }

    return out;
  },
};
