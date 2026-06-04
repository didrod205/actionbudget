<div align="center">

# 🧾 actionbudget

### Find what's burning your GitHub Actions minutes — before the bill does.

[![npm version](https://img.shields.io/npm/v/actionbudget.svg?color=success)](https://www.npmjs.com/package/actionbudget)
[![CI](https://github.com/didrod205/actionbudget/actions/workflows/ci.yml/badge.svg)](https://github.com/didrod205/actionbudget/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/actionbudget.svg)](https://www.npmjs.com/package/actionbudget)
[![license](https://img.shields.io/npm/l/actionbudget.svg)](./LICENSE)

</div>

Your GitHub Actions usage creeps up and you find out from the **billing page** — or
when the free minutes run out mid-sprint. The waste is hiding in plain sight in your
YAML: a workflow with **no `concurrency`** keeps three superseded runs alive on a
busy PR, `setup-node` **reinstalls deps every run** because caching is off, a
**push + pull_request** pair runs CI *twice* per commit, a **12-job matrix** pays
full setup nine extra times, and a job with **no `timeout-minutes`** can bill six
hours when it hangs.

**actionbudget reads your workflow files and lists exactly what's wasting
minutes — locally, deterministically, with the one-line fix.** No app to install on
your org, no API token, no waiting for the invoice.

```bash
npx actionbudget scan
```

```
.github/workflows/ci.yml (CI)  64/100 (D)
  ⚠ No concurrency group — superseded runs keep running   L4   no-concurrency
  ⚠ setup-node without dependency caching   job:test L20   missing-cache
  ⚠ push + pull_request run CI twice per PR commit   L4   duplicate-triggers
  ⚠ Matrix expands to 12 jobs   job:test L10   large-matrix
  ⚠ Schedule runs every ~5 min   L6   frequent-schedule
  ℹ macOS runner bills at 10× Linux   job:mac-build L26   costly-runner
```

---

## Why actionbudget?

- 💸 **It's about cost, not syntax.** `actionlint` checks your YAML is *valid*;
  `zizmor` checks it's *secure*. Neither tells you it's **wasteful**. actionbudget
  owns that gap — caching, concurrency, matrices, timeouts, triggers, runners.
- 🎯 **Every finding has a fix.** Not "this could be better" — the exact
  `concurrency:` block, the `cache: npm` line, the `paths:` filter to add.
- 🔒 **Local & deterministic.** Parses the YAML with a real parser (no guessing),
  runs offline, gives the same result every time. Drop it in CI and the build fails
  when a PR adds a 9× matrix.
- 🧮 **Honest about cost.** It reports structural waste and multipliers (matrix
  size, macOS 10× / Windows 2×) — deterministic facts from your YAML, not a
  made-up dollar figure.

Why not just ask an LLM "is my CI wasteful"? It can't see all your workflow files at
once, can't run on every PR, and "does push+pull_request double-run here" depends on
your exact branch filters — a structural check, not a vibe.

## Install

```bash
# run it now, from your repo root
npx actionbudget scan

# or add it
npm install -g actionbudget      # global CLI
npm install -D actionbudget      # CI dependency
```

Node ≥ 18. With no arguments it scans `.github/workflows`.

## Quick start

```bash
actionbudget scan                          # scan .github/workflows
actionbudget scan path/to/ci.yml           # a single file
actionbudget scan --min-score 80           # CI gate
actionbudget scan --md budget.md           # Markdown report for a PR comment
actionbudget scan --disable no-timeout,no-path-filter
actionbudget init                          # write actionbudget.config.json
```

See [`examples/sample-report.md`](./examples/sample-report.md) for a full report and
[`examples/.github/workflows/lean.yml`](./examples/.github/workflows/lean.yml) for a
workflow that scores 100/100.

## What it checks

| Rule | What it catches |
| ---- | --------------- |
| `no-concurrency` / `no-cancel-in-progress` | push/PR workflows that don't cancel superseded runs |
| `missing-cache` | `setup-node`/`-python`/`-java`/`-dotnet`/`-ruby` with caching off |
| `duplicate-triggers` | `push` + `pull_request` with an unfiltered `push` → double runs |
| `no-path-filter` | heavy triggers with no `paths:` filter (docs-only changes run full CI) |
| `large-matrix` | a build matrix that fans out past your threshold |
| `frequent-schedule` | `schedule:` crons that fire more often than your floor |
| `costly-runner` | macOS (10×) / Windows (2×) runner cost multipliers |
| `no-timeout` | jobs with no `timeout-minutes` (360-min default) |
| `full-history-checkout` | `actions/checkout` with `fetch-depth: 0` |

Each finding is a weighted error / warning / info; workflows roll up to a 0–100
score and an A–F grade you can gate in CI.

## Real scenarios

**1. Gate CI cost in CI.** Add actionbudget to your pipeline so a PR that adds a
`macos-latest` matrix or drops caching fails review:

```yaml
# .github/workflows/budget.yml
- run: npx actionbudget scan --min-score 85 --md budget.md
```

**2. Audit a repo you just inherited.** `npx actionbudget scan` from the root
prints every workflow ranked by score — see the worst offenders in one screen.

**3. Trim an org's biggest spender.** Point it at a monorepo's `.github/workflows`
and the `large-matrix` + `costly-runner` + `missing-cache` findings show where the
minutes actually go.

## Configuration

`actionbudget init` writes `actionbudget.config.json`:

```jsonc
{
  "disable": [],              // rule ids to skip, e.g. ["no-path-filter"]
  "maxMatrixJobs": 6,         // warn when a matrix fans out past this
  "requireTimeout": true,     // flag jobs without timeout-minutes
  "minScheduleMinutes": 15,   // flag schedules tighter than this
  "minScore": 0               // CI gate threshold
}
```

## Library API

```ts
import { analyzeWorkflow, DEFAULT_CONFIG } from "actionbudget";

const report = analyzeWorkflow("ci.yml", yamlText, DEFAULT_CONFIG);
for (const f of report.findings) console.log(f.severity, f.rule, f.fix);
```

Also exported: `buildReport`, `parseWorkflow`, the `RULES` registry, and types.

## Roadmap

- 🤖 **Optional `--ai` layer (bring-your-own key)** to draft the refactored
  workflow YAML for a finding. The core stays 100% offline and deterministic.
- Reusable-workflow (`workflow_call`) and composite-action awareness.
- An estimated minutes/month figure when you supply average job durations.
- More rules: artifact retention, redundant `needs`, always-uploading artifacts.
- A `--fix` mode that applies the safe, mechanical fixes.

## 💖 Sponsor

actionbudget is free and MIT-licensed, built and maintained in spare time. If it
trimmed your CI bill, please consider supporting it:

- ⭐ **Star this repo** — the simplest free way to help others find it.
- 🍋 **[Sponsor via Lemon Squeezy](https://elab-studio.lemonsqueezy.com/checkout/buy/5d059b89-51d0-456b-b33a-ed56994f7010)** — one-time or recurring.

## License

[MIT](./LICENSE) © actionbudget contributors
