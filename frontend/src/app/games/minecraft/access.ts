import { requireModuleUser } from "@/lib/server-api";

export async function hasFullMinecraftAccess(): Promise<boolean> {
  const user = await requireModuleUser("minecraft");
  return user.modules.includes("minecraft");
}
