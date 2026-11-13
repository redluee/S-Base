import { serverApi } from "@/lib/server-api";
import { ProjectsClient } from "./client";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([
    serverApi.cashflow.projects.list(),
    serverApi.cashflow.clients.list(),
  ]);
  return <ProjectsClient initialProjects={projects} initialClients={clients} />;
}
