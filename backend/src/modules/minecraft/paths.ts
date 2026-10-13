import { join } from "path";
import { homedir } from "os";

export const BASE_DIR = process.env.MC_SERVERS_DIR || process.env.MINECRAFT_DIR || join(homedir(), "minecraft", "servers");
export const TEMPLATES_DIR = process.env.MC_TEMPLATES_DIR || process.env.MINECRAFT_TEMPLATES_DIR || join(BASE_DIR, "..", "templates");
