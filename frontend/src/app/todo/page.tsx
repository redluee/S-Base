import { requireModuleUser, serverApi } from "@/lib/server-api";
import { TodoClient } from "./client";

export default async function TodoPage() {
  const [user, snapshot] = await Promise.all([
    requireModuleUser("todo"),
    serverApi.todo.snapshot().catch(() => null),
  ]);
  return <TodoClient initial={snapshot} userId={user.id} />;
}
