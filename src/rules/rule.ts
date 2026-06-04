/** Shared rule interface and helpers. */

import type { Config, Finding, Job, Workflow } from "../types.js";

export interface Rule {
  id: string;
  run(workflow: Workflow, config: Config): Finding[];
}

/** True if the action reference matches `owner/name` (ignoring the @version). */
export function usesAction(use: string | undefined, name: string): boolean {
  if (!use) return false;
  const at = use.indexOf("@");
  const ref = (at >= 0 ? use.slice(0, at) : use).toLowerCase();
  return ref === name.toLowerCase() || ref.startsWith(name.toLowerCase() + "/");
}

/** Does any step in the job use the given action? */
export function jobUses(job: Job, name: string): boolean {
  return job.steps.some((s) => usesAction(s.uses, name));
}

export function eventNames(workflow: Workflow): Set<string> {
  return new Set(workflow.triggers.map((t) => t.event));
}
