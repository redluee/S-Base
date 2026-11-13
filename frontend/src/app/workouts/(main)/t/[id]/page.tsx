import { notFoundOn404, serverApi } from "@/lib/server-api";

import { WorkoutTemplateDetail } from "@/app/workouts/templates/workout-template-detail";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await notFoundOn404(serverApi.workouts.templates.get(Number(id)));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <WorkoutTemplateDetail template={template} />
      </div>
  );
}
