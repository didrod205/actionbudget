/** The registry of waste rules, in report order. */

import { cacheRule } from "./cache.js";
import { checkoutRule } from "./checkout.js";
import { concurrencyRule } from "./concurrency.js";
import { matrixRule } from "./matrix.js";
import { runnerRule } from "./runner.js";
import { scheduleRule } from "./schedule.js";
import { timeoutRule } from "./timeout.js";
import { triggersRule } from "./triggers.js";
import type { Rule } from "./rule.js";

export const RULES: Rule[] = [
  concurrencyRule,
  cacheRule,
  matrixRule,
  triggersRule,
  scheduleRule,
  runnerRule,
  timeoutRule,
  checkoutRule,
];

export type { Rule } from "./rule.js";
