import { serverApi } from "@/lib/server-api";
import type { CashflowClient, CashflowTradeName } from "@/lib/api";
import { NewProjectClient } from "./client";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const editId = edit ? Number(edit) : null;
  const [clients, tradeNames, project] = await Promise.all([
    serverApi.cashflow.clients.list().catch((): CashflowClient[] => []),
    serverApi.cashflow.tradeNames.list().catch((): CashflowTradeName[] => []),
    editId ? serverApi.cashflow.projects.get(editId).catch(() => null) : Promise.resolve(null),
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
