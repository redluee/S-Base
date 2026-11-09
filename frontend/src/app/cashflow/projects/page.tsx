import { serverApi } from "@/lib/server-api";
import type { CashflowClient, CashflowProject } from "@/lib/api";
import { ProjectsClient } from "./client";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    serverApi.cashflow.projects.list().catch((): CashflowProject[] => []),
    serverApi.cashflow.clients.list().catch((): CashflowClient[] => []),
  ]);
  return <ProjectsClient initialProjects={projects} initialClients={clients} />;
}
