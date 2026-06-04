/**
 * Runner cost multipliers. On GitHub-hosted runners, **macOS bills at 10×** and
 * **Windows at 2×** the per-minute rate of Linux. Using them is often a real
 * requirement — but it's worth seeing where the multiplier (× the matrix) lands.
 */

import type { Finding, Workflow } from "../types.js";
import type { Rule } from "./rule.js";

function multiplierFor(label: string): { os: string; mult: number } | null {
  const l = label.toLowerCase();
  if (l.includes("macos") || l.includes("mac-")) return { os: "macOS", mult: 10 };
  if (l.includes("windows")) return { os: "Windows", mult: 2 };
  return null;
}

export const runnerRule: Rule = {
  id: "costly-runner",
  run(workflow: Workflow): Finding[] {
    const out: Finding[] = [];
    for (const job of workflow.jobs) {
      const hits = new Map<string, number>();
      for (const label of job.runsOn) {
        const m = multiplierFor(label);
        if (m) hits.set(m.os, m.mult);
      }
      for (const [os, mult] of hits) {
        out.push({
          rule: "costly-runner",
          severity: "info",
          job: job.id,
          title: `${os} runner bills at ${mult}× Linux`,
          message: `Job "${job.id}" uses a ${os} runner${job.matrixSize > 1 ? ` across ~${job.matrixSize} matrix jobs` : ""}, charged at ${mult}× the Linux minute rate.`,
          line: job.line,
          waste: mult >= 10 ? 18 : 10,
          fix: `Run on ubuntu-latest where possible, and reserve ${os} for the few jobs that need it.`,
        });
      }
    }
    return out;
  },
};
