import { ForbiddenError } from "../../utils/errors";
import type { MinecraftService } from "./index";

export type MinecraftAction = "read" | "start" | "manage";

export interface MinecraftAccessRequest {
  userId: number;
  hasFullAccess: boolean;
  slug?: string;
  action: MinecraftAction;
}

export class MinecraftAccess {
  constructor(private readonly parts: Pick<MinecraftService, "servers">) {}

  authorize({ userId, hasFullAccess, slug, action }: MinecraftAccessRequest) {
    if (slug !== undefined && !this.parts.servers.canAccess(userId, slug, hasFullAccess)) {
      throw new ForbiddenError("minecraft.serverForbidden");
    }
    if (action === "manage" && !hasFullAccess) throw new ForbiddenError("minecraft.fullAccessRequired");
  }
}
