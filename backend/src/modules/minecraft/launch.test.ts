import { describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { formatJavaLaunchCommand, parseJavaArgs } from "./launch";
import { FIXTURE_DIR } from "./minecraft-test-utils";

describe("Java launch command", () => {
  it("parses whitespace and JSON-array argument lists", () => {
    expect(parseJavaArgs(null)).toEqual([]);
    expect(parseJavaArgs("  ")).toEqual([]);
    expect(parseJavaArgs("-Xms2G   -Xmx4G -XX:+UseG1GC")).toEqual(["-Xms2G", "-Xmx4G", "-XX:+UseG1GC"]);
    expect(parseJavaArgs('["-Xms1G", " -Xmx2G "]')).toEqual(["-Xms1G", "-Xmx2G"]);
  });

  it("adds 2G memory and G1 tuning when no arguments are configured", () => {
    const cmd = formatJavaLaunchCommand("vanilla", FIXTURE_DIR, null);
    expect(cmd.startsWith("java -Xms2G -Xmx2G -XX:+UseG1GC ")).toBe(true);
    expect(cmd.endsWith(" -jar server.jar nogui")).toBe(true);
  });

  it("keeps custom arguments as-is and only fills in missing memory bounds", () => {
    expect(formatJavaLaunchCommand("vanilla", FIXTURE_DIR, "-Xms4G -Xmx8G -XX:+UseZGC")).toBe(
      "java -Xms4G -Xmx8G -XX:+UseZGC -jar server.jar nogui",
    );
    expect(formatJavaLaunchCommand("vanilla", FIXTURE_DIR, "-Xmx6G")).toBe(
      "java -Xms512M -Xmx6G -jar server.jar nogui",
    );
    expect(formatJavaLaunchCommand("vanilla", FIXTURE_DIR, "-Xms1G")).toBe("java -Xmx2G -Xms1G -jar server.jar nogui");
  });

  it("launches the fabric jar only for fabric servers that have it installed", async () => {
    const dir = join(FIXTURE_DIR, "launch-fabric");
    await mkdir(dir, { recursive: true });
    try {
      expect(formatJavaLaunchCommand("fabric", dir, "-Xmx2G")).toEndWith("-jar server.jar nogui");
      await writeFile(join(dir, "fabric-server-launch.jar"), "");
      expect(formatJavaLaunchCommand("fabric", dir, "-Xmx2G")).toEndWith("-jar fabric-server-launch.jar nogui");
      expect(formatJavaLaunchCommand("vanilla", dir, "-Xmx2G")).toEndWith("-jar server.jar nogui");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
