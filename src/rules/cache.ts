/**
 * Dependency caching. `actions/setup-node` (and friends) re-download and
 * re-install dependencies on every run unless caching is turned on — often the
 * single slowest part of a job. We flag setup steps that don't enable caching,
 * unless the job wires up `actions/cache` manually.
 */

import type { Finding, Job, Workflow } from "../types.js";
import { jobUses, usesAction, type Rule } from "./rule.js";

/** Setup actions whose caching is OFF by default and must be enabled. */
const SETUP_ACTIONS: { action: string; input: string; label: string }[] = [
  { action: "actions/setup-node", input: "cache", label: "setup-node" },
  { action: "actions/setup-python", input: "cache", label: "setup-python" },
  { action: "actions/setup-java", input: "cache", label: "setup-java" },
  { action: "actions/setup-dotnet", input: "cache", label: "setup-dotnet" },
  { action: "ruby/setup-ruby", input: "bundler-cache", label: "setup-ruby" },
];

export const cacheRule: Rule = {
  id: "missing-cache",
  run(workflow: Workflow): Finding[] {
    const out: Finding[] = [];
    for (const job of workflow.jobs) {
      // If the job manages caching itself, don't second-guess it.
      if (jobUses(job, "actions/cache")) continue;
      const flagged = new Set<string>();

      for (const step of job.steps) {
        for (const setup of SETUP_ACTIONS) {
          if (!usesAction(step.uses, setup.action)) continue;
          const hasCache = setup.input in step.with && step.with[setup.input] !== "false";
          if (hasCache || flagged.has(setup.label)) continue;
          flagged.add(setup.label);
          out.push(reportFor(job, step.line, setup));
        }
      }
    }
    return out;
  },
};

function reportFor(
  job: Job,
  line: number,
  setup: { action: string; input: string; label: string },
): Finding {
  return {
    rule: "missing-cache",
    severity: "warning",
    job: job.id,
    title: `${setup.label} without dependency caching`,
    message: `Job "${job.id}" runs ${setup.label} without \`${setup.input}\`, reinstalling dependencies every run.`,
    line,
    waste: 25,
    fix: `Enable caching, e.g. add \`with: { ${setup.input}: 'npm' }\` to the ${setup.label} step.`,
  };
}
