import { serverApi } from "@/lib/server-api";
import type { McTemplate } from "@/lib/api";
import TemplatesPage from "./client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const templates: McTemplate[] = await serverApi.minecraft.templates.list().catch(() => []);
  return <TemplatesPage initialTemplates={templates} />;
}
