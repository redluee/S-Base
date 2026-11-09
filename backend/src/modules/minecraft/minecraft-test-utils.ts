import { spyOn } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "path";
import { BASE_DIR } from "./paths";

export const FIXTURE_DIR = join(BASE_DIR, "fixtures");

const noProcess = { exitCode: 1, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) } as ReturnType<typeof Bun.spawnSync>;
const FABRIC_ARGS = ["server", "-mcversion", "1.21.1", "-loader", "0.16.0", "-downloadMinecraft"];

export function mockExternalCalls(): () => void {
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation((async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json") {
      return Response.json({
        versions: [
          { id: "1.21.1", type: "release", url: "https://example.com/version.json" },
          { id: "24w33a", type: "snapshot" },
          { id: "1.21", type: "release" },
        ],
      });
    }
    if (url === "https://example.com/version.json") {
      return Response.json({ downloads: { server: { url: "https://example.com/server.jar" } } });
    }
    if (url === "https://meta.fabricmc.net/v2/versions/loader/1.21.1") {
      return Response.json([{ loader: { stable: true, version: "0.16.0" } }]);
    }
    if (url === "https://meta.fabricmc.net/v2/versions/installer") {
      return Response.json([{ stable: true, url: "https://example.com/installer.jar" }]);
    }
    if (url === "https://example.com/server.jar" || url === "https://example.com/installer.jar") {
      return new Response("test jar bytes");
    }
    throw new Error(`Unexpected test URL: ${url}`);
  }) as unknown as typeof fetch);
  const spawnMock = spyOn(Bun, "spawnSync").mockImplementation(((command: string[], options?: { cwd?: string }) => {
    if (Array.isArray(command) && (command[0] === "pgrep" || (command[0] === "tmux" && command[1] === "has-session"))) {
      return noProcess;
    }
    const cwd = String(options?.cwd);
    const expected = ["java", "-jar", join(cwd, "fabric-installer.jar"), ...FABRIC_ARGS];
    if (!Array.isArray(command) || command.join(" ") !== expected.join(" ")) {
      throw new Error(`Unexpected test command: ${String(command)}`);
    }
    writeFileSync(join(cwd, "fabric-server-launch.jar"), "test fabric jar");
    return { exitCode: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) } as ReturnType<typeof Bun.spawnSync>;
  }) as unknown as typeof Bun.spawnSync);
  return () => {
    fetchMock.mockRestore();
    spawnMock.mockRestore();
  };
}
