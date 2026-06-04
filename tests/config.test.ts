import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, parseConfig, mergeConfig } from "../src/config.js";
import { loadConfig } from "../src/load-config.js";

describe("config", () => {
  it("parses and merges over defaults", () => {
    const cfg = parseConfig(JSON.stringify({ minScore: 80, maxMatrixJobs: 4 }));
    expect(cfg.minScore).toBe(80);
    expect(cfg.maxMatrixJobs).toBe(4);
    expect(cfg.minScheduleMinutes).toBe(DEFAULT_CONFIG.minScheduleMinutes);
  });

  it("throws a clear error on invalid JSON", () => {
    expect(() => parseConfig("{ broken")).toThrow(/invalid config/);
  });

  it("mergeConfig ignores undefined overrides", () => {
    const cfg = mergeConfig(DEFAULT_CONFIG, { minScore: undefined as unknown as number });
    expect(cfg.minScore).toBe(DEFAULT_CONFIG.minScore);
  });

  it("loadConfig returns defaults when no file is present", () => {
    const dir = mkdtempSync(join(tmpdir(), "actionbudget-"));
    expect(loadConfig(undefined, dir).maxMatrixJobs).toBe(DEFAULT_CONFIG.maxMatrixJobs);
    rmSync(dir, { recursive: true, force: true });
  });

  it("loadConfig reads an explicit file", () => {
    const dir = mkdtempSync(join(tmpdir(), "actionbudget-"));
    const file = join(dir, "actionbudget.config.json");
    writeFileSync(file, JSON.stringify({ minScore: 70 }));
    expect(loadConfig(file).minScore).toBe(70);
    rmSync(dir, { recursive: true, force: true });
  });
});
