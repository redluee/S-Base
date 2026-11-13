import { notFoundOn404, serverApi } from "@/lib/server-api";

import { WorkoutTemplateForm } from "@/app/workouts/templates/workout-template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await notFoundOn404(serverApi.workouts.templates.get(Number(id)));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <WorkoutTemplateForm initial={template} />
      </div>
  );
}
