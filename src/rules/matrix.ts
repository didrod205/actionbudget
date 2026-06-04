/**
 * Matrix size. A build matrix multiplies out: 3 Node versions × 3 OSes = 9 jobs,
 * each paying setup + install. Large matrices are sometimes necessary, but they
 * are also where minutes silently 9× — so we surface the job count.
 */

import type { Config, Finding, Workflow } from "../types.js";
import type { Rule } from "./rule.js";

export const matrixRule: Rule = {
  id: "large-matrix",
  run(workflow: Workflow, config: Config): Finding[] {
    const out: Finding[] = [];
    for (const job of workflow.jobs) {
      if (job.matrixSize > config.maxMatrixJobs) {
        const dims = job.matrix
          ? Object.entries(job.matrix)
              .map(([k, vals]) => `${k}(${vals.length})`)
              .join(" × ")
          : "matrix";
        out.push({
          rule: "large-matrix",
          severity: "warning",
          job: job.id,
          title: `Matrix expands to ${job.matrixSize} jobs`,
          message: `Job "${job.id}" fans out to ${job.matrixSize} parallel jobs (${dims}).`,
          line: job.line,
          waste: Math.min(40, job.matrixSize * 2),
          detail: "Every combination pays full setup + install + the rest of the job.",
          fix: "Trim the matrix to the combinations you actually ship, or use `include` for the few extras.",
        });
      }
    }
    return out;
  },
};
