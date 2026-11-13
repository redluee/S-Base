import { useState } from "react";
import { DEFAULT_SERVER_PORT, defaultMotd } from "@backend/shared/minecraft";

export type ServerSettings = ReturnType<typeof useServerSettings>;
type SettingsValues = Omit<ServerSettings, `set${string}` | "activeSettingsTab">;

const flag = (value: boolean) => (value ? "true" : "false");

export function settingsToProperties(
  s: SettingsValues,
  serverName: string,
  { includeSeed }: { includeSeed: boolean },
): Record<string, string> {
  return {
    motd: s.motd || defaultMotd(serverName),
    "server-port": s.serverPort || String(DEFAULT_SERVER_PORT),
    "max-players": s.maxPlayers || "20",
    "online-mode": flag(s.onlineMode),
    "white-list": flag(s.whiteList),
    gamemode: s.gamemode,
    difficulty: s.difficulty,
    pvp: flag(s.pvp),
    hardcore: flag(s.hardcore),
    "allow-flight": flag(s.allowFlight),
    "enable-command-block": flag(s.enableCommandBlock),
    "do-fire-tick": flag(s.doFireTick),
    "level-name": s.levelName || "world",
    ...(includeSeed ? { "level-seed": s.levelSeed } : {}),
    "level-type": s.levelType,
    "generate-structures": flag(s.generateStructures),
    "allow-nether": flag(s.allowNether),
    "spawn-monsters": flag(s.spawnMonsters),
    "spawn-animals": flag(s.spawnAnimals),
    "view-distance": s.viewDistance || "10",
    "simulation-distance": s.simulationDistance || "10",
  };
}

export function useServerSettings() {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "gameplay" | "world" | "performance">("general");
  const [motd, setMotd] = useState("");
  const [serverPort, setServerPort] = useState(String(DEFAULT_SERVER_PORT));
  const [maxPlayers, setMaxPlayers] = useState("20");
  const [onlineMode, setOnlineMode] = useState(true);
  const [whiteList, setWhiteList] = useState(false);
  const [gamemode, setGamemode] = useState("survival");
  const [difficulty, setDifficulty] = useState("normal");
  const [pvp, setPvp] = useState(true);
  const [hardcore, setHardcore] = useState(false);
  const [allowFlight, setAllowFlight] = useState(false);
  const [enableCommandBlock, setEnableCommandBlock] = useState(false);
  const [doFireTick, setDoFireTick] = useState(true);
  const [levelName, setLevelName] = useState("world");
  const [levelSeed, setLevelSeed] = useState("");
  const [levelType, setLevelType] = useState("minecraft:normal");
  const [generateStructures, setGenerateStructures] = useState(true);
  const [allowNether, setAllowNether] = useState(true);
  const [spawnMonsters, setSpawnMonsters] = useState(true);
  const [spawnAnimals, setSpawnAnimals] = useState(true);
  const [viewDistance, setViewDistance] = useState("10");
  const [simulationDistance, setSimulationDistance] = useState("10");

  return {
    activeSettingsTab,
    setActiveSettingsTab,
    motd,
    setMotd,
    serverPort,
    setServerPort,
    maxPlayers,
    setMaxPlayers,
    onlineMode,
    setOnlineMode,
    whiteList,
    setWhiteList,
    gamemode,
    setGamemode,
    difficulty,
    setDifficulty,
    pvp,
    setPvp,
    hardcore,
    setHardcore,
    allowFlight,
    setAllowFlight,
    enableCommandBlock,
    setEnableCommandBlock,
    doFireTick,
    setDoFireTick,
    levelName,
    setLevelName,
    levelSeed,
    setLevelSeed,
    levelType,
    setLevelType,
    generateStructures,
    setGenerateStructures,
    allowNether,
    setAllowNether,
    spawnMonsters,
    setSpawnMonsters,
    spawnAnimals,
    setSpawnAnimals,
    viewDistance,
    setViewDistance,
    simulationDistance,
    setSimulationDistance,
  };
}
