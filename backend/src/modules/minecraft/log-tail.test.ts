import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { readLogTail } from "./log-tail";

describe("readLogTail", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "mc-log-tail-"));
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("returns the last lines without empty entries", async () => {
    const path = join(dir, "latest.log");
    await Bun.write(path, "one\ntwo\n\nthree\nfour\n");
    expect(await readLogTail(path, 2)).toEqual(["three", "four"]);
    expect(await readLogTail(path, 10)).toEqual(["one", "two", "three", "four"]);
  });

  it("returns an empty list for a missing file", async () => {
    expect(await readLogTail(join(dir, "missing.log"), 5)).toEqual([]);
  });

  it("drops the partial first line when only the end of a large log is read", async () => {
    const path = join(dir, "big.log");
    const line = `${"x".repeat(99)}\n`;
    await Bun.write(path, `${line.repeat(8000)}last line\n`);
    expect(await readLogTail(path, 3)).toEqual(["x".repeat(99), "x".repeat(99), "last line"]);
    const all = await readLogTail(path, 100000);
    expect(all.every((l) => l === "x".repeat(99) || l === "last line")).toBe(true);
  });
});
