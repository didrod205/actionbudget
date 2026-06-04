/** Core types for actionbudget. */

export type Severity = "error" | "warning" | "info" | "pass";

export interface Finding {
  /** Stable id, e.g. "no-concurrency". */
  rule: string;
  severity: Severity;
  /** Job id the finding belongs to, when job-scoped. */
  job?: string;
  title: string;
  message: string;
  /** 1-based source line. */
  line?: number;
  detail?: string;
  fix?: string;
  /**
   * Relative waste weight (0–100) used to rank and score. Higher = more wasted
   * minutes. Deterministic, not a real-time estimate.
   */
  waste: number;
}

// --- Parsed workflow model ----------------------------------------------

export interface Trigger {
  /** Event name: push, pull_request, schedule, workflow_dispatch, … */
  event: string;
  branches?: string[];
  paths?: string[];
  pathsIgnore?: string[];
  /** cron expressions for `schedule`. */
  crons?: string[];
  line: number;
}

export interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with: Record<string, string>;
  line: number;
}

export interface Job {
  id: string;
  /** Literal runner labels found (after resolving simple matrix refs). */
  runsOn: string[];
  timeoutMinutes?: number;
  hasConcurrency: boolean;
  /** matrix dimension → its values (array dimensions only). */
  matrix?: Record<string, unknown[]>;
  /** Estimated number of matrix jobs (1 when no matrix). */
  matrixSize: number;
  failFast?: boolean;
  steps: Step[];
  line: number;
}

export interface Workflow {
  name?: string;
  triggers: Trigger[];
  hasConcurrency: boolean;
  cancelInProgress?: boolean;
  jobs: Job[];
  /** Parse errors, if the file was malformed. */
  error?: string;
}

// --- Reports ------------------------------------------------------------

export interface WorkflowReport {
  source: string;
  name?: string;
  score: number;
  grade: string;
  counts: { error: number; warning: number; info: number };
  findings: Finding[];
}

export interface Report {
  tool: "actionbudget";
  version: string;
  generatedAt: string;
  summary: {
    workflows: number;
    score: number;
    grade: string;
    errors: number;
    warnings: number;
    infos: number;
    /** Sum of all findings' waste weights — a relative "how much is left on the table". */
    totalWaste: number;
  };
  workflows: WorkflowReport[];
}

export interface Config {
  /** Rule ids to disable. */
  disable: string[];
  /** Warn when a matrix produces more than this many jobs. */
  maxMatrixJobs: number;
  /** Warn when a job has no timeout (default GitHub limit is 360 min). */
  requireTimeout: boolean;
  /** Flag schedules that run more often than this many minutes apart. */
  minScheduleMinutes: number;
  /** CI gate: minimum overall score. */
  minScore: number;
}
