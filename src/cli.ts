#!/usr/bin/env node
/** actionbudget command-line interface. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cac } from "cac";
import pc from "picocolors";
import pkg from "../package.json";
import { analyzeWorkflow, buildReport } from "./analyze.js";
import { DEFAULT_CONFIG } from "./config.js";
import { loadConfig } from "./load-config.js";
import { loadInputs } from "./loader.js";
import { printReport } from "./report/console.js";
import { toJSON } from "./report/json.js";
import { toMarkdown } from "./report/markdown.js";
import type { Config, Report } from "./types.js";

const cli = cac("actionbudget");

function fail(message: string): never {
  console.error(`${pc.red("actionbudget:")} ${message}`);
  process.exit(2);
}

interface ScanOptions {
  config?: string;
  disable?: string;
  json?: string;
  md?: string;
  minScore?: string;
  quiet?: boolean;
}

cli
  .command("scan [...targets]", "Lint workflow YAML for CI waste (defaults to .github/workflows)")
  .option("--config <file>", "Path to a config file")
  .option("--disable <rules>", "Comma-separated rule ids to skip")
  .option("--json <file>", "Write a JSON report to this path")
  .option("--md <file>", "Write a Markdown report to this path")
  .option("--min-score <n>", "CI gate: exit non-zero if the overall score is below this")
  .option("--quiet", "Show only per-workflow summary lines")
  .example("  actionbudget scan")
  .example("  actionbudget scan .github/workflows/ci.yml")
  .example("  actionbudget scan --min-score 80 --md budget.md")
  .action((targets: string[], options: ScanOptions) => {
    try {
      const config: Config = loadConfig(options.config);
      if (options.disable) {
        config.disable = [
          ...config.disable,
          ...options.disable.split(",").map((s) => s.trim()).filter(Boolean),
        ];
      }

      const inputs = loadInputs(targets);
      if (inputs.length === 0) {
        fail(
          targets.length === 0
            ? "no workflows found in .github/workflows. Pass a path, or run from your repo root."
            : "no .yml/.yaml workflow files found.",
        );
      }

      const workflows = inputs.map((i) => analyzeWorkflow(i.source, i.text, config));
      const report = buildReport(workflows, {
        version: pkg.version,
        generatedAt: new Date().toISOString(),
      });

      printReport(report, Boolean(options.quiet));

      if (options.json) {
        writeFileSync(resolve(options.json), toJSON(report));
        console.log(pc.dim(`\nWrote JSON report → ${options.json}`));
      }
      if (options.md) {
        writeFileSync(resolve(options.md), toMarkdown(report));
        console.log(pc.dim(`Wrote Markdown report → ${options.md}`));
      }

      const minScore = options.minScore !== undefined ? Number(options.minScore) : config.minScore;
      if (report.summary.score < minScore) {
        console.error(`\n${pc.red("actionbudget:")} score ${report.summary.score} is below the minimum ${minScore}.`);
        process.exit(1);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

cli
  .command("report <input>", "Render a saved JSON report as Markdown")
  .option("--md <file>", "Write Markdown to this path instead of stdout")
  .action((input: string, options: { md?: string }) => {
    try {
      const report = JSON.parse(readFileSync(resolve(input), "utf8")) as Report;
      const md = toMarkdown(report);
      if (options.md) {
        writeFileSync(resolve(options.md), md);
        console.log(`Wrote ${options.md}`);
      } else {
        process.stdout.write(md);
      }
    } catch (e) {
      fail((e as Error).message);
    }
  });

cli
  .command("init", "Write an actionbudget.config.json with the defaults")
  .option("--force", "Overwrite an existing config")
  .action((options: { force?: boolean }) => {
    const file = resolve("actionbudget.config.json");
    if (existsSync(file) && !options.force) {
      console.error(`${pc.red("actionbudget:")} actionbudget.config.json already exists (use --force).`);
      process.exit(1);
    }
    writeFileSync(file, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
    console.log("Created actionbudget.config.json");
  });

cli.help();
cli.version(pkg.version);
cli.parse();
