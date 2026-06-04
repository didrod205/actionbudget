/** Orchestrator: parse a workflow, run every rule, score it, assemble reports. */

import { parseWorkflow } from "./model.js";
import { RULES } from "./rules/index.js";
import { gradeFor, scoreFindings } from "./score.js";
import type { Config, Finding, Report, WorkflowReport } from "./types.js";

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2, pass: 3 };

/** Analyze a single workflow file's YAML text. */
export function analyzeWorkflow(source: string, text: string, config: Config): WorkflowReport {
  const workflow = parseWorkflow(text);

  let findings: Finding[];
  if (workflow.error) {
    findings = [
      {
        rule: "parse-error",
        severity: "error",
        title: "Could not parse workflow YAML",
        message: workflow.error,
        waste: 0,
      },
    ];
  } else {
    const disabled = new Set(config.disable);
    findings = RULES.filter((r) => !disabled.has(r.id))
      .flatMap((rule) => rule.run(workflow, config))
      .filter((f) => !disabled.has(f.rule));
  }

  findings.sort((a, b) => {
    const s = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    return s !== 0 ? s : b.waste - a.waste;
  });

  const counts = { error: 0, warning: 0, info: 0 };
  for (const f of findings) {
    if (f.severity === "error") counts.error++;
    else if (f.severity === "warning") counts.warning++;
    else if (f.severity === "info") counts.info++;
  }
  const score = scoreFindings(findings);

  return { source, name: workflow.name, score, grade: gradeFor(score), counts, findings };
}

/** Assemble a multi-workflow {@link Report}. */
export function buildReport(
  workflows: WorkflowReport[],
  meta: { version: string; generatedAt: string },
): Report {
  const errors = workflows.reduce((s, w) => s + w.counts.error, 0);
  const warnings = workflows.reduce((s, w) => s + w.counts.warning, 0);
  const infos = workflows.reduce((s, w) => s + w.counts.info, 0);
  const totalWaste = workflows.reduce((s, w) => s + w.findings.reduce((a, f) => a + f.waste, 0), 0);
  const score = workflows.length
    ? Math.round(workflows.reduce((s, w) => s + w.score, 0) / workflows.length)
    : 100;

  return {
    tool: "actionbudget",
    version: meta.version,
    generatedAt: meta.generatedAt,
    summary: {
      workflows: workflows.length,
      score,
      grade: gradeFor(score),
      errors,
      warnings,
      infos,
      totalWaste,
    },
    workflows,
  };
}
