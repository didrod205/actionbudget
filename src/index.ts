/**
 * actionbudget — lint GitHub Actions workflows for CI-minute waste, locally and
 * deterministically. Parses workflow YAML and flags missing caching, no
 * concurrency cancellation, no job timeouts, oversized matrices, duplicate
 * push+pull_request runs, frequent schedules and costly runners.
 *
 * ```ts
 * import { analyzeWorkflow, DEFAULT_CONFIG } from "actionbudget";
 * const report = analyzeWorkflow("ci.yml", yamlText, DEFAULT_CONFIG);
 * ```
 */

export { analyzeWorkflow, buildReport } from "./analyze.js";
export { parseWorkflow } from "./model.js";
export { scoreFindings, gradeFor } from "./score.js";
export { RULES, type Rule } from "./rules/index.js";
export { estimateCronIntervalMinutes } from "./rules/schedule.js";
export { DEFAULT_CONFIG, CONFIG_FILENAMES, parseConfig, mergeConfig } from "./config.js";
export type {
  Config,
  Finding,
  Job,
  Report,
  Severity,
  Step,
  Trigger,
  Workflow,
  WorkflowReport,
} from "./types.js";
