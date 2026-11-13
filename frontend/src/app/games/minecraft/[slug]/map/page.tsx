import { hasFullMinecraftAccess } from "@/app/games/minecraft/access";
import WorldMapPage from "./client";

export default async function Page() {
  return <WorldMapPage hasFullAccess={await hasFullMinecraftAccess()} />;
}
