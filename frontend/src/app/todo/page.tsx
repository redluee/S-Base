import { serverApi } from "@/lib/server-api";
import { TodoClient } from "./client";

export default async function TodoPage() {
  const snapshot = await serverApi.todo.snapshot().catch(() => null);
  return <TodoClient initial={snapshot} />;
}
