import { notFoundOn404, requireModuleUser, serverApi } from "@/lib/server-api";
import { WorkoutSessionLive } from "@/app/workouts/session/workout-session-live";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ afronden?: string }>;
}) {
  await requireModuleUser("workout");

  const { id } = await params;
  const { afronden } = await searchParams;

  if (id === "quick") {
    return (
      <div className="min-h-screen flex flex-col">
        <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <WorkoutSessionLive />
        </main>
      </div>
    );
  }

  const session = await notFoundOn404(serverApi.workouts.sessions.get(Number(id)));

  return (
    <div className="min-h-screen flex flex-col">
      <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <WorkoutSessionLive session={session} autoFinish={afronden === "1"} />
      </main>
    </div>
  );
}
