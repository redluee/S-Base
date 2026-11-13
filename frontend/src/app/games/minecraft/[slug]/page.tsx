import { hasFullMinecraftAccess } from "@/app/games/minecraft/access";
import ServerDashboardPage from "./client";

export default async function Page() {
  return <ServerDashboardPage hasFullAccess={await hasFullMinecraftAccess()} />;
}
