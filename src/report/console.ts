/** Colored console output for `scan`. */

import pc from "picocolors";
import type { Report, Severity } from "../types.js";

const MARK: Record<Severity, string> = { error: "✗", warning: "⚠", info: "ℹ", pass: "✓" };

function color(severity: Severity, text: string): string {
  if (severity === "error") return pc.red(text);
  if (severity === "warning") return pc.yellow(text);
  if (severity === "info") return pc.blue(text);
  return pc.green(text);
}

function gradeColor(grade: string): (s: string) => string {
  if (grade === "A" || grade === "B") return pc.green;
  if (grade === "C" || grade === "D") return pc.yellow;
  return pc.red;
}

export function printReport(report: Report, quiet = false): void {
  for (const wf of report.workflows) {
    const g = gradeColor(wf.grade);
    const label = wf.name ? `${wf.source} ${pc.dim(`(${wf.name})`)}` : wf.source;
    console.log(`\n${pc.bold(label)}  ${g(`${wf.score}/100 (${wf.grade})`)}`);

    if (quiet) continue;
    if (wf.findings.length === 0) {
      console.log(`  ${pc.green("✓ no waste found")}`);
      continue;
    }
    for (const f of wf.findings) {
      const loc = [f.job ? `job:${f.job}` : "", f.line ? `L${f.line}` : ""].filter(Boolean).join(" ");
      console.log(`  ${color(f.severity, MARK[f.severity])} ${f.title} ${pc.dim(loc)} ${pc.dim(f.rule)}`);
      if (f.fix) {
        const firstLine = f.fix.split("\n")[0]!;
        console.log(`       ${pc.dim("→ " + firstLine)}`);
      }
    }
  }

  const s = report.summary;
  const g = gradeColor(s.grade);
  console.log(
    `\n${pc.bold("Overall")}  ${g(`${s.score}/100 (${s.grade})`)} ` +
      pc.dim(`· ${s.workflows} workflow(s), ${s.errors} error(s), ${s.warnings} warning(s), ${s.infos} info(s)`),
  );
}
