import { describe, expect, it } from "vitest";
import { parseWorkflow } from "../src/model.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { concurrencyRule } from "../src/rules/concurrency.js";
import { cacheRule } from "../src/rules/cache.js";
import { matrixRule } from "../src/rules/matrix.js";
import { triggersRule } from "../src/rules/triggers.js";
import { runnerRule } from "../src/rules/runner.js";
import { timeoutRule } from "../src/rules/timeout.js";
import type { Rule } from "../src/rules/rule.js";

const run = (rule: Rule, yaml: string, config = DEFAULT_CONFIG) =>
  rule.run(parseWorkflow(yaml), config).map((f) => f.rule);

describe("concurrencyRule", () => {
  it("flags a push/PR workflow with no concurrency", () => {
    expect(run(concurrencyRule, "on: pull_request\njobs: {}")).toContain("no-concurrency");
  });
  it("flags concurrency without cancel-in-progress", () => {
    const yaml = "on: push\nconcurrency:\n  group: g\njobs: {}";
    expect(run(concurrencyRule, yaml)).toContain("no-cancel-in-progress");
  });
  it("is quiet with cancel-in-progress, or for non-cancellable events", () => {
    expect(run(concurrencyRule, "on: push\nconcurrency:\n  group: g\n  cancel-in-progress: true\njobs: {}")).toEqual([]);
    expect(run(concurrencyRule, "on: workflow_dispatch\njobs: {}")).toEqual([]);
  });
});

describe("cacheRule", () => {
  const setupNoCache =
    "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n      - run: npm ci";

  it("flags setup-node without caching", () => {
    expect(run(cacheRule, setupNoCache)).toContain("missing-cache");
  });
  it("is quiet when cache is enabled", () => {
    const yaml =
      "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm";
    expect(run(cacheRule, yaml)).toEqual([]);
  });
  it("is quiet when the job uses actions/cache directly", () => {
    const yaml =
      "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/cache@v4\n      - uses: actions/setup-node@v4";
    expect(run(cacheRule, yaml)).toEqual([]);
  });
});

describe("matrixRule", () => {
  it("flags a matrix larger than the configured cap", () => {
    const yaml =
      "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        a: [1,2,3,4]\n        b: [x,y]\n    steps: []";
    expect(run(matrixRule, yaml)).toContain("large-matrix"); // 8 > default 6
  });
  it("is quiet for a small matrix", () => {
    const yaml =
      "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        a: [1,2]\n    steps: []";
    expect(run(matrixRule, yaml)).toEqual([]);
  });
});

describe("triggersRule", () => {
  it("flags unfiltered push alongside pull_request", () => {
    expect(run(triggersRule, "on: [push, pull_request]\njobs: {}")).toContain("duplicate-triggers");
  });
  it("does not flag duplicate when push is branch-filtered", () => {
    const yaml = "on:\n  push:\n    branches: [main]\n  pull_request:\njobs: {}";
    expect(run(triggersRule, yaml)).not.toContain("duplicate-triggers");
  });
});

describe("runnerRule & timeoutRule", () => {
  it("flags a macOS runner as a cost multiplier", () => {
    expect(run(runnerRule, "on: push\njobs:\n  m:\n    runs-on: macos-latest\n    steps: []")).toContain(
      "costly-runner",
    );
  });
  it("flags a job with no timeout when required", () => {
    expect(run(timeoutRule, "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps: []")).toContain(
      "no-timeout",
    );
  });
  it("respects requireTimeout=false", () => {
    expect(
      run(timeoutRule, "on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps: []", {
        ...DEFAULT_CONFIG,
        requireTimeout: false,
      }),
    ).toEqual([]);
  });
});
