import { describe, expect, it } from "vitest";
import { parseWorkflow } from "../src/model.js";

describe("parseWorkflow", () => {
  it("parses the string, list and map forms of `on`", () => {
    expect(parseWorkflow("on: push\njobs: {}").triggers.map((t) => t.event)).toEqual(["push"]);
    expect(parseWorkflow("on: [push, pull_request]\njobs: {}").triggers.map((t) => t.event)).toEqual([
      "push",
      "pull_request",
    ]);
    const mapForm = parseWorkflow("on:\n  push:\n    branches: [main]\njobs: {}");
    expect(mapForm.triggers[0]!.event).toBe("push");
    expect(mapForm.triggers[0]!.branches).toEqual(["main"]);
  });

  it("collects schedule cron expressions", () => {
    const wf = parseWorkflow('on:\n  schedule:\n    - cron: "*/10 * * * *"\njobs: {}');
    expect(wf.triggers[0]!.crons).toEqual(["*/10 * * * *"]);
  });

  it("reads jobs, steps, runs-on, timeout and concurrency", () => {
    const wf = parseWorkflow(
      [
        "on: push",
        "concurrency:",
        "  group: g",
        "  cancel-in-progress: true",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    timeout-minutes: 10",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - run: npm test",
      ].join("\n"),
    );
    expect(wf.hasConcurrency).toBe(true);
    expect(wf.cancelInProgress).toBe(true);
    const job = wf.jobs[0]!;
    expect(job.id).toBe("build");
    expect(job.runsOn).toEqual(["ubuntu-latest"]);
    expect(job.timeoutMinutes).toBe(10);
    expect(job.steps).toHaveLength(2);
    expect(job.steps[0]!.uses).toBe("actions/checkout@v4");
  });

  it("computes matrix size as the product of dimensions", () => {
    const wf = parseWorkflow(
      [
        "on: push",
        "jobs:",
        "  test:",
        "    runs-on: ubuntu-latest",
        "    strategy:",
        "      matrix:",
        "        node: [16, 18, 20]",
        "        os: [a, b]",
        "    steps: []",
      ].join("\n"),
    );
    expect(wf.jobs[0]!.matrixSize).toBe(6);
  });

  it("resolves a runs-on matrix reference to the matrix values", () => {
    const wf = parseWorkflow(
      [
        "on: push",
        "jobs:",
        "  test:",
        "    runs-on: ${{ matrix.os }}",
        "    strategy:",
        "      matrix:",
        "        os: [ubuntu-latest, macos-latest]",
        "    steps: []",
      ].join("\n"),
    );
    expect(wf.jobs[0]!.runsOn).toEqual(["ubuntu-latest", "macos-latest"]);
  });

  it("attaches source line numbers", () => {
    const wf = parseWorkflow("on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: []");
    expect(wf.jobs[0]!.line).toBe(3);
  });

  it("reports a parse error for malformed YAML", () => {
    const wf = parseWorkflow("on: push\n  bad: : :\njobs");
    expect(wf.error).toBeDefined();
  });
});
