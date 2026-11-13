import type { mc_player_stats, mc_templates } from "../db/schema/minecraft";
import type { MinecraftFiles } from "../modules/minecraft/minecraft-files";
import type { MinecraftImporter } from "../modules/minecraft/minecraft-importer";
import type { MinecraftLifecycle } from "../modules/minecraft/minecraft-lifecycle";
import type { MinecraftMap } from "../modules/minecraft/minecraft-map";
import type { MinecraftServers, ServerRow } from "../modules/minecraft/minecraft-servers";

export type { McFileInfo } from "../modules/minecraft/minecraft-files";
export type { ServerInspection as McServerInspection } from "../modules/minecraft/minecraft-importer";
export type { BannedPlayer as McBannedPlayer } from "../modules/minecraft/minecraft-players";

export type McServer = ServerRow & { online?: boolean; hasMap?: boolean };
export type McServerDetail = ReturnType<MinecraftServers["detail"]>;
export type McServerStatus = ReturnType<MinecraftLifecycle["getStatus"]>;
export type McMapStatus = ReturnType<MinecraftMap["status"]>;
export type McTemplate = typeof mc_templates.$inferSelect;
export type McPlayerStat = typeof mc_player_stats.$inferSelect;
export type McUnregisteredServerScan = Awaited<ReturnType<MinecraftImporter["scan"]>>[number];
export type McUploadResult = Awaited<ReturnType<MinecraftFiles["uploadMany"]>>;
