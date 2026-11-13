import { describe, expect, it } from "bun:test";
import { mergeProperties, parseProperties } from "./server-properties";

describe("server.properties", () => {
  it("parses keys and values, skipping comments, blanks and lines without =", () => {
    const content =
      "#Minecraft server properties\n  # indented comment\n\nmotd = Hello = world \nlevel-name=world\nbroken\n";
    expect(parseProperties(content)).toEqual({ motd: "Hello = world", "level-name": "world" });
  });

  it("replaces existing keys in place, keeps comments and appends new keys", () => {
    const content = "#comment\ndifficulty=easy\n  pvp = true\nmotd=old";
    expect(mergeProperties(content, { pvp: "false", motd: "new", "max-players": "5" })).toBe(
      "#comment\ndifficulty=easy\npvp=false\nmotd=new\nmax-players=5",
    );
  });

  it("writes only the given keys when there is no file yet", () => {
    expect(mergeProperties("", { motd: "hi" })).toBe("motd=hi");
  });
});
