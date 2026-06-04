# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-04

Initial public release.

### Added

- **Waste rules** for GitHub Actions workflows, each with a one-line fix:
  `no-concurrency` / `no-cancel-in-progress`, `missing-cache` (setup-node/python/
  java/dotnet/ruby), `duplicate-triggers` (unfiltered push + pull_request),
  `no-path-filter`, `large-matrix`, `frequent-schedule`, `costly-runner`
  (macOS 10× / Windows 2×), `no-timeout`, and `full-history-checkout`.
- Exact YAML parsing (via the `yaml` package) into a typed workflow model with
  source line numbers; matrix-size estimation and `runs-on` matrix resolution.
- Per-rule waste weights, a weighted 0–100 score with an A–F grade, and a
  per-report `totalWaste` figure.
- `scan` (defaults to `.github/workflows`), `report` and `init` commands with
  JSON/Markdown export, a CI score gate, and config files.
- Library API: `analyzeWorkflow`, `buildReport`, `parseWorkflow`, the `RULES`
  registry, and full TypeScript types.
