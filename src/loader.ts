/** Discover workflow YAML files from paths/directories. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

export interface InputFile {
  source: string;
  text: string;
}

const YAML_EXT = new Set([".yml", ".yaml"]);

/** The conventional location, used when no target is given. */
export const DEFAULT_TARGET = ".github/workflows";

function collect(target: string, out: string[]): void {
  const stat = statSync(target);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(target, { withFileTypes: true })) {
      if (entry.isFile() && YAML_EXT.has(extname(entry.name).toLowerCase())) {
        out.push(join(target, entry.name));
      }
    }
  } else if (YAML_EXT.has(extname(target).toLowerCase())) {
    out.push(target);
  }
}

export function loadInputs(targets: string[]): InputFile[] {
  const resolved = targets.length > 0 ? targets : [DEFAULT_TARGET];
  const files: string[] = [];
  for (const target of resolved) {
    const abs = resolve(target);
    if (!existsSync(abs)) {
      if (targets.length === 0) continue; // default dir simply absent
      throw new Error(`path not found: ${target}`);
    }
    collect(abs, files);
  }

  const cwd = process.cwd();
  const out: InputFile[] = [];
  for (const file of [...new Set(files)].sort()) {
    try {
      out.push({
        source: file.startsWith(cwd) ? relative(cwd, file) || file : file,
        text: readFileSync(file, "utf8"),
      });
    } catch {
      /* unreadable; skip */
    }
  }
  return out;
}
