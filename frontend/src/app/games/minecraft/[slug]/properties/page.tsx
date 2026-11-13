import { hasFullMinecraftAccess } from "@/app/games/minecraft/access";
import PropertiesPage from "./client";

export default async function Page() {
  return <PropertiesPage hasFullAccess={await hasFullMinecraftAccess()} />;
}
