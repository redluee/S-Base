import { notFoundOn404, serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { NavHeader } from "@/components/nav-header";
import { WorkoutTemplateForm } from "@/app/workouts/templates/workout-template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const { id } = await params;
  const template = await notFoundOn404(serverApi.workouts.templates.get(Number(id)));

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <WorkoutTemplateForm initial={template} />
      </main>
    </div>
  );
}
