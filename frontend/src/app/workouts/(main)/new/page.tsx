import { notFoundOn404, serverApi } from "@/lib/server-api";

import { WorkoutTemplateForm } from "@/app/workouts/templates/workout-template-form";
import { sessionToTemplatePrefill } from "@/app/workouts/templates/session-to-template";
import { parseDateString } from "@backend/shared/dates";
import { t } from "@/lib/lang";

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ vanSessie?: string }>;
}) {
  const { vanSessie } = await searchParams;
  const sourceSessionId = vanSessie && /^\d+$/.test(vanSessie) ? Number(vanSessie) : undefined;
  const sourceSession = sourceSessionId
    ? await notFoundOn404(serverApi.workouts.sessions.get(sourceSessionId))
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {sourceSession && (
          <p className="text-sm text-muted-foreground mb-6">
            {t("Prefilled from your workout of {date}. Adjust it and save.", {
              date: parseDateString(sourceSession.startedAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            })}
          </p>
        )}
        <WorkoutTemplateForm
          key={sourceSessionId ?? "new"}
          prefill={sourceSession ? sessionToTemplatePrefill(sourceSession) : undefined}
          sourceSessionId={sourceSessionId}
        />
      </div>
  );
}
