import { notFoundOn404, serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { WorkoutSessionLive } from "@/app/workouts/session/workout-session-live";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ afronden?: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { id } = await params;
  const { afronden } = await searchParams;

  if (id === "quick") {
    return (
      <div className="min-h-screen flex flex-col">
        <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <WorkoutSessionLive userId={user.id} />
        </main>
      </div>
    );
  }

  const session = await notFoundOn404(serverApi.workouts.sessions.get(Number(id)));

  return (
    <div className="min-h-screen flex flex-col">
      <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <WorkoutSessionLive session={session} userId={user.id} autoFinish={afronden === "1"} />
      </main>
    </div>
  );
}
