# Contributing to actionbudget

Thanks for your interest! actionbudget is built so that **adding a waste rule is
small and isolated**. Most contributions are a new rule.

## Getting started

```bash
git clone https://github.com/didrod205/actionbudget.git
cd actionbudget
npm install
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run build       # tsup → dist/
node dist/cli.js scan examples/.github/workflows
```

## Project layout

```
src/
  model.ts          # YAML → typed Workflow model (with line numbers)
  rules/
    rule.ts         # Rule interface + helpers (usesAction, jobUses, …)
    concurrency.ts  # one file per rule (the interesting part)
    cache.ts  matrix.ts  triggers.ts  schedule.ts  runner.ts  timeout.ts  checkout.ts
    index.ts        # the rule registry (report order)
  analyze.ts        # run rules, score, build reports
  score.ts          # weighted score + grade
  config.ts         # pure defaults/merge      load-config.ts # fs loading
  loader.ts         # discover workflow files
  report/           # console / json / markdown
  cli.ts            # cac CLI
tests/              # vitest specs (incl. integration over examples/)
examples/.github/workflows/  # wasteful.yml + lean.yml (100/100)
```

## Adding a rule

1. Create `src/rules/<name>.ts` exporting a `Rule` (`{ id, run(workflow, config) }`).
   Return `Finding[]` with a stable `rule` id, a severity, a `waste` weight, and —
   importantly — a concrete `fix`.
2. Register it in `src/rules/index.ts`.
3. Add a test in `tests/rules.test.ts` (a positive case that fires, and a negative
   case that stays quiet), and an assertion in `tests/analyze.test.ts` if it's
   observable on the example workflows.

## Quality bar

- [ ] Every finding has an actionable `fix` (the value is the fix, not the flag).
- [ ] Rules don't false-positive on the `lean.yml` example (it must stay 100/100).
- [ ] `npm run typecheck && npm test && npm run build` all pass.
- [ ] Regenerated `examples/sample-report.*` if output changed.

> Accuracy matters: a cost claim (e.g. "macOS bills at 10×") should reflect
> GitHub's documented behaviour. A wrong rule trains people to ignore the linter.
