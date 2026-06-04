import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeWorkflow, buildReport } from "../src/analyze.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const read = (f: string) => readFileSync(resolve("examples/.github/workflows", f), "utf8");
const META = { version: "test", generatedAt: "2026-06-04T00:00:00Z" };

describe("analyzeWorkflow (integration over example workflows)", () => {
  it("gives the lean workflow a perfect score", () => {
    const wf = analyzeWorkflow("lean.yml", read("lean.yml"), DEFAULT_CONFIG);
    expect(wf.findings).toHaveLength(0);
    expect(wf.score).toBe(100);
    expect(wf.grade).toBe("A");
  });

  it("catches every waste pattern in the wasteful workflow", () => {
    const wf = analyzeWorkflow("wasteful.yml", read("wasteful.yml"), DEFAULT_CONFIG);
    const r = new Set(wf.findings.map((f) => f.rule));
    for (const rule of [
      "no-concurrency",
      "missing-cache",
      "duplicate-triggers",
      "large-matrix",
      "frequent-schedule",
      "costly-runner",
      "no-timeout",
      "full-history-checkout",
    ]) {
      expect(r.has(rule)).toBe(true);
    }
  });

  it("ranks findings errors/warnings before infos", () => {
    const wf = analyzeWorkflow("wasteful.yml", read("wasteful.yml"), DEFAULT_CONFIG);
    const firstInfo = wf.findings.findIndex((f) => f.severity === "info");
    const lastWarning = wf.findings.map((f) => f.severity).lastIndexOf("warning");
    expect(lastWarning).toBeLessThan(firstInfo);
  });

  it("honors the disable list", () => {
    const cfg = { ...DEFAULT_CONFIG, disable: ["missing-cache", "no-timeout"] };
    const wf = analyzeWorkflow("wasteful.yml", read("wasteful.yml"), cfg);
    const r = new Set(wf.findings.map((f) => f.rule));
    expect(r.has("missing-cache")).toBe(false);
    expect(r.has("no-timeout")).toBe(false);
  });

  it("surfaces a parse error as an error finding", () => {
    const wf = analyzeWorkflow("bad.yml", "on: push\n  : : :\njobs", DEFAULT_CONFIG);
    expect(wf.findings[0]!.rule).toBe("parse-error");
    expect(wf.counts.error).toBe(1);
  });

  it("buildReport aggregates score and total waste", () => {
    const report = buildReport(
      [
        analyzeWorkflow("lean.yml", read("lean.yml"), DEFAULT_CONFIG),
        analyzeWorkflow("wasteful.yml", read("wasteful.yml"), DEFAULT_CONFIG),
      ],
      META,
    );
    expect(report.summary.workflows).toBe(2);
    expect(report.summary.totalWaste).toBeGreaterThan(0);
    expect(report.summary.score).toBeGreaterThan(0);
    expect(report.summary.score).toBeLessThan(100);
  });
});
