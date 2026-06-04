/**
 * Parse a GitHub Actions workflow YAML into a typed {@link Workflow} model with
 * source line numbers. Uses the `yaml` package's AST so analysis is exact — a
 * hand-rolled YAML parser would risk wrong findings, and a linter that's
 * sometimes wrong gets ignored.
 */

import {
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  type Node,
  type YAMLMap,
} from "yaml";
import type { Job, Step, Trigger, Workflow } from "./types.js";

type AnyNode = Node | null | undefined;

function get(node: AnyNode, key: string): AnyNode {
  return isMap(node) ? ((node as YAMLMap).get(key, true) as AnyNode) : undefined;
}

function str(node: AnyNode): string | undefined {
  return isScalar(node) && node.value != null ? String(node.value) : undefined;
}

function num(node: AnyNode): number | undefined {
  if (isScalar(node) && typeof node.value === "number") return node.value;
  if (isScalar(node) && typeof node.value === "string" && node.value.trim() !== "") {
    const n = Number(node.value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function bool(node: AnyNode): boolean | undefined {
  return isScalar(node) && typeof node.value === "boolean" ? node.value : undefined;
}

function strArray(node: AnyNode): string[] {
  if (isSeq(node)) return node.items.map((i) => str(i as AnyNode)).filter((s): s is string => !!s);
  const single = str(node);
  return single ? [single] : [];
}

function lineOf(node: AnyNode, lc: LineCounter): number | undefined {
  const range = node && typeof node === "object" && "range" in node ? node.range : undefined;
  return range ? lc.linePos(range[0]).line : undefined;
}

/** Map entries as [keyString, valueNode, keyLine]. */
function entries(node: AnyNode, lc: LineCounter): { key: string; value: AnyNode; line?: number }[] {
  if (!isMap(node)) return [];
  return node.items.map((pair) => ({
    key: String(isScalar(pair.key) ? pair.key.value : pair.key),
    value: pair.value as AnyNode,
    line: lineOf(pair.key as AnyNode, lc),
  }));
}

function parseTriggers(onNode: AnyNode, lc: LineCounter): Trigger[] {
  if (!onNode) return [];
  if (isScalar(onNode)) return [{ event: String(onNode.value), line: lineOf(onNode, lc) ?? 1 }];
  if (isSeq(onNode)) {
    return onNode.items
      .map((i) => str(i as AnyNode))
      .filter((s): s is string => !!s)
      .map((event) => ({ event, line: lineOf(onNode, lc) ?? 1 }));
  }
  if (isMap(onNode)) {
    return entries(onNode, lc).map(({ key, value, line }) => {
      const trigger: Trigger = { event: key, line: line ?? 1 };
      const branches = strArray(get(value, "branches"));
      const paths = strArray(get(value, "paths"));
      const pathsIgnore = strArray(get(value, "paths-ignore"));
      if (branches.length) trigger.branches = branches;
      if (paths.length) trigger.paths = paths;
      if (pathsIgnore.length) trigger.pathsIgnore = pathsIgnore;
      if (key === "schedule" && isSeq(value)) {
        trigger.crons = value.items
          .map((i) => str(get(i as AnyNode, "cron")))
          .filter((s): s is string => !!s);
      }
      return trigger;
    });
  }
  return [];
}

function parseMatrix(strategy: AnyNode): { matrix?: Record<string, unknown[]>; size: number; failFast?: boolean } {
  const matrixNode = get(strategy, "matrix");
  const failFast = bool(get(strategy, "fail-fast"));
  if (!isMap(matrixNode)) return { size: 1, failFast };

  const matrix: Record<string, unknown[]> = {};
  let product = 1;
  let dims = 0;
  let includeAdds = 0;
  let excludeRemoves = 0;

  for (const { key, value } of entries(matrixNode, new LineCounter())) {
    if (key === "include") {
      if (isSeq(value)) includeAdds = value.items.length;
      continue;
    }
    if (key === "exclude") {
      if (isSeq(value)) excludeRemoves = value.items.length;
      continue;
    }
    if (isSeq(value)) {
      const values = value.items.map((i) => (isScalar(i) ? i.value : i));
      matrix[key] = values;
      product *= Math.max(1, values.length);
      dims++;
    }
  }

  const base = dims > 0 ? product : 0;
  const size = Math.max(1, base - excludeRemoves) + includeAdds;
  return { matrix: dims > 0 ? matrix : undefined, size, failFast };
}

function parseSteps(stepsNode: AnyNode, lc: LineCounter): Step[] {
  if (!isSeq(stepsNode)) return [];
  return stepsNode.items.map((item) => {
    const withMap: Record<string, string> = {};
    for (const e of entries(get(item as AnyNode, "with"), lc)) {
      const v = str(e.value);
      withMap[e.key] = v ?? (e.value != null ? "true" : "");
    }
    return {
      name: str(get(item as AnyNode, "name")),
      uses: str(get(item as AnyNode, "uses")),
      run: str(get(item as AnyNode, "run")),
      with: withMap,
      line: lineOf(item as AnyNode, lc) ?? 1,
    };
  });
}

const MATRIX_REF = /\$\{\{\s*matrix\.([A-Za-z0-9_-]+)\s*\}\}/;

function resolveRunsOn(node: AnyNode, matrix?: Record<string, unknown[]>): string[] {
  const raw = strArray(node);
  const out: string[] = [];
  for (const label of raw) {
    const m = MATRIX_REF.exec(label);
    if (m && matrix && matrix[m[1]!]) {
      for (const v of matrix[m[1]!]!) out.push(String(v));
    } else {
      out.push(label);
    }
  }
  return out;
}

function parseJob(id: string, node: AnyNode, keyLine: number | undefined, lc: LineCounter): Job {
  const { matrix, size, failFast } = parseMatrix(get(node, "strategy"));
  return {
    id,
    runsOn: resolveRunsOn(get(node, "runs-on"), matrix),
    timeoutMinutes: num(get(node, "timeout-minutes")),
    hasConcurrency: get(node, "concurrency") != null,
    matrix,
    matrixSize: size,
    failFast,
    steps: parseSteps(get(node, "steps"), lc),
    line: keyLine ?? lineOf(node, lc) ?? 1,
  };
}

export function parseWorkflow(text: string): Workflow {
  const lc = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lc });
  if (doc.errors.length > 0) {
    return { triggers: [], jobs: [], hasConcurrency: false, error: doc.errors[0]!.message };
  }
  const root = doc.contents as AnyNode;
  const concurrency = get(root, "concurrency");

  const jobsNode = get(root, "jobs");
  const jobs: Job[] = entries(jobsNode, lc).map(({ key, value, line }) =>
    parseJob(key, value, line, lc),
  );

  return {
    name: str(get(root, "name")),
    triggers: parseTriggers(get(root, "on"), lc),
    hasConcurrency: concurrency != null,
    cancelInProgress: bool(get(concurrency, "cancel-in-progress")),
    jobs,
  };
}
