import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { AppError, ValidationError } from "../../utils/errors";

const MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const VERSION_CACHE_MS = 3600000;

interface VersionManifest {
  versions?: { id: string; type: string; url: string }[];
}
interface VersionDetail {
  downloads: { server: { url: string } };
}
interface FabricLoader {
  loader: { stable: boolean; version: string };
}
interface FabricInstaller {
  stable: boolean;
  url: string;
}

async function getJson<T>(url: string): Promise<T> {
  return (await (await fetch(url)).json()) as T;
}

async function fetchBytes(url: string, destFile: string) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  await mkdir(join(destFile, ".."), { recursive: true });
  await writeFile(destFile, Buffer.from(buf));
}

export class MinecraftDownloads {
  private versionCache: string[] | null = null;
  private versionCacheTime = 0;

  async installJar(engine: string, mcVersion: string, destDir: string) {
    if (engine === "vanilla") await this.vanilla(mcVersion, destDir);
    else if (engine === "fabric") await this.fabric(mcVersion, destDir);
  }

  async vanilla(mcVersion: string, destDir: string) {
    const manifest = await getJson<VersionManifest>(MANIFEST_URL);
    const version = manifest.versions?.find((x) => x.id === mcVersion);
    if (!version) throw new ValidationError("minecraft.versionNotFound", { version: mcVersion });
    const detail = await getJson<VersionDetail>(version.url);
    await fetchBytes(detail.downloads.server.url, join(destDir, "server.jar"));
  }

  async fabric(mcVersion: string, destDir: string) {
    const loaders = await getJson<FabricLoader[]>(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
    if (!Array.isArray(loaders) || loaders.length === 0) {
      throw new ValidationError("minecraft.fabricVersionNotFound", { version: mcVersion });
    }
    const loader = loaders.find((x) => x.loader.stable)?.loader?.version || loaders[0]?.loader?.version;
    if (!loader) throw new AppError(502, "minecraft.fabricLoaderUnavailable");

    const installers = await getJson<FabricInstaller[]>("https://meta.fabricmc.net/v2/versions/installer");
    const installer = installers.find((x) => x.stable)?.url || installers[0]?.url;
    if (!installer) throw new AppError(502, "minecraft.fabricInstallerUnavailable");

    const installerJar = join(destDir, "fabric-installer.jar");
    await fetchBytes(installer, installerJar);

    const proc = Bun.spawnSync(
      ["java", "-jar", installerJar, "server", "-mcversion", mcVersion, "-loader", loader, "-downloadMinecraft"],
      { cwd: destDir },
    );
    if (proc.exitCode !== 0) {
      console.error(`[Minecraft] Fabric installer failed: ${proc.stderr?.toString() || proc.stdout?.toString()}`);
      throw new AppError(502, "minecraft.fabricInstallFailed");
    }
  }

  async listVersions(): Promise<string[]> {
    if (Date.now() - this.versionCacheTime < VERSION_CACHE_MS && this.versionCache) return this.versionCache;
    const manifest = await getJson<VersionManifest>(MANIFEST_URL);
    this.versionCache = (manifest.versions || []).filter((x) => x.type === "release").map((x) => x.id);
    this.versionCacheTime = Date.now();
    return this.versionCache;
  }
}
