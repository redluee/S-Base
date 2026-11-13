import { notFoundOn404, serverApi } from "@/lib/server-api";
import { NewProjectClient } from "./client";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const [clients, tradeNames, project] = await Promise.all([
    serverApi.cashflow.clients.list(),
    serverApi.cashflow.tradeNames.list(),
    editId ? notFoundOn404(serverApi.cashflow.projects.get(editId)) : Promise.resolve(null),
  ]);
  return (
    <NewProjectClient
      key={editId ?? "new"}
      editId={editId}
      initialProject={project}
      initialClients={clients}
      tradeNames={tradeNames}
    />
  );
}
