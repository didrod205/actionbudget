import { describe, expect, it } from "vitest";
import { estimateCronIntervalMinutes } from "../src/rules/schedule.js";

describe("estimateCronIntervalMinutes", () => {
  it("estimates every-N-minute crons", () => {
    expect(estimateCronIntervalMinutes("* * * * *")).toBe(1);
    expect(estimateCronIntervalMinutes("*/5 * * * *")).toBe(5);
    expect(estimateCronIntervalMinutes("*/30 * * * *")).toBe(30);
  });

  it("treats a fixed minute with any hour as hourly", () => {
    expect(estimateCronIntervalMinutes("0 * * * *")).toBe(60);
  });

  it("estimates every-N-hour crons", () => {
    expect(estimateCronIntervalMinutes("0 */6 * * *")).toBe(360);
  });

  it("treats a fixed minute and hour as daily", () => {
    expect(estimateCronIntervalMinutes("0 3 * * *")).toBe(1440);
  });

  it("returns Infinity for an invalid cron", () => {
    expect(estimateCronIntervalMinutes("nonsense")).toBe(Infinity);
  });
});
