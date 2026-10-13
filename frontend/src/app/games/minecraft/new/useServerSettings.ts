import { useState } from "react";

export function useServerSettings() {
  // Step 3: Properties (Categorized)
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "gameplay" | "world" | "performance">("general");

  // General
  const [motd, setMotd] = useState("");
  const [serverPort, setServerPort] = useState("25565");
  const [maxPlayers, setMaxPlayers] = useState("20");
  const [onlineMode, setOnlineMode] = useState(true);
  const [whiteList, setWhiteList] = useState(false);

  // Gameplay
  const [gamemode, setGamemode] = useState("survival");
  const [difficulty, setDifficulty] = useState("normal");
  const [pvp, setPvp] = useState(true);
  const [hardcore, setHardcore] = useState(false);
  const [allowFlight, setAllowFlight] = useState(false);
  const [enableCommandBlock, setEnableCommandBlock] = useState(false);
  const [doFireTick, setDoFireTick] = useState(true);

  // World
  const [levelName, setLevelName] = useState("world");
  const [levelSeed, setLevelSeed] = useState("");
  const [levelType, setLevelType] = useState("minecraft:normal");
  const [generateStructures, setGenerateStructures] = useState(true);
  const [allowNether, setAllowNether] = useState(true);
  const [spawnMonsters, setSpawnMonsters] = useState(true);
  const [spawnAnimals, setSpawnAnimals] = useState(true);

  // Performance
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
