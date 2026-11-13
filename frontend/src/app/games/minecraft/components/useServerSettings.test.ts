import { describe, expect, it } from "bun:test";
import { settingsToProperties } from "./useServerSettings";

const base = {
  motd: "",
  serverPort: "",
  maxPlayers: "",
  onlineMode: true,
  whiteList: false,
  gamemode: "survival",
  difficulty: "normal",
  pvp: true,
  hardcore: false,
  allowFlight: false,
  enableCommandBlock: false,
  doFireTick: true,
  levelName: "",
  levelSeed: "1234",
  levelType: "minecraft:normal",
  generateStructures: true,
  allowNether: true,
  spawnMonsters: true,
  spawnAnimals: true,
  viewDistance: "",
  simulationDistance: "",
};

describe("settingsToProperties", () => {
  it("fills blanks with the server defaults and writes booleans as strings", () => {
    const props = settingsToProperties(base, "Hangout", { includeSeed: true });
    expect(props).toMatchObject({
      motd: "A Minecraft Server: Hangout",
      "server-port": "25565",
      "max-players": "20",
      "level-name": "world",
      "level-seed": "1234",
      "online-mode": "true",
      hardcore: "false",
    });
  });

  it("leaves the seed out for templates", () => {
    expect(settingsToProperties(base, "T", { includeSeed: false })).not.toHaveProperty("level-seed");
  });
});
