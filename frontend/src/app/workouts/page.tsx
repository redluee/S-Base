import { serverApi } from "@/lib/server-api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/nav-header";
import { MotivationalQuote } from "@/components/motivational-quote";
import { t } from "@/lib/lang";
import { Dumbbell, Calendar } from "lucide-react";

export default async function WorkoutsPage() {
  let user: { id: number; username: string } | null = null;
  try {
    user = (await serverApi.me()).user;
  } catch {}
  if (!user) redirect("/");

  const [templates, stats] = await Promise.all([
    serverApi.workouts.templates.list(),
    serverApi.workouts.stats()
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader username={user.username} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("Workout Studio")}
          </h1>
          <div className="flex gap-2">
            <Link href="/workouts/exercises">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm h-9 sm:h-10 flex items-center gap-1.5 cursor-pointer">
                <Dumbbell className="size-3.5 sm:size-4 text-brand" />
                <span className="hidden sm:inline">{t("Exercises")}</span>
              </Button>
            </Link>
            <Link href="/workouts/history">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm h-9 sm:h-10 flex items-center gap-1.5 cursor-pointer">
                <Calendar className="size-3.5 sm:size-4 text-brand" />
                <span className="hidden sm:inline">{t("History")}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 flex flex-col items-center justify-center text-center min-h-[130px]">
            {stats.daysAgo === null ? (
              <>
                <span className="text-4xl sm:text-5xl font-black text-foreground font-display">Geen</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">{t("trainingen voltooid")}</span>
              </>
            ) : stats.daysAgo === 0 ? (
              <>
                <span className="text-4xl sm:text-5xl font-black text-foreground font-display">Vandaag</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">{t("was je laatste training")}</span>
              </>
            ) : stats.daysAgo === 1 ? (
              <>
                <span className="text-4xl sm:text-5xl font-black text-foreground font-display">1 dag</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">{t("geleden was je laatste training")}</span>
              </>
            ) : (
              <>
                <span className="text-4xl sm:text-5xl font-black text-foreground font-display">{stats.daysAgo} dagen</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">{t("geleden was je laatste training")}</span>
              </>
            )}
          </div>
          <div className="rounded-xl bg-card p-4 sm:p-5 ring-1 ring-foreground/10 flex flex-col justify-center min-h-[130px]">
            {(() => {
              const nextMilestone = Math.floor(stats.totalWorkouts / 50) * 50 + 50;
              const prevMilestone = nextMilestone - 50;
              const progressCount = stats.totalWorkouts - prevMilestone;
              const percentage = Math.min(100, Math.max(0, (progressCount / 50) * 100));

              return (
                <div className="flex flex-col w-full text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-brand font-display">{stats.totalWorkouts}</span>
                    <span className="text-zinc-500 text-sm font-semibold font-display">/ {nextMilestone}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 font-medium">
                    {50 - progressCount} {t("tot volgende mijlpaal")}
                  </span>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800/80 h-2 rounded-full mt-3 overflow-hidden border border-white/5">
                    <div 
                      className="bg-brand h-full rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 flex flex-col items-center justify-center text-center min-h-[130px]">
            <span className="text-4xl sm:text-5xl font-black text-amber-400 font-display">{stats.totalVolume.toLocaleString()} kg</span>
            <span className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">{t("volume verplaatst")}</span>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <MotivationalQuote />
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
            <div className="size-12 sm:size-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="size-6 sm:size-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("No templates yet.")}</p>
            <Link href="/workouts/new">
              <Button className="bg-brand text-zinc-900 hover:bg-brand-hover text-sm">
                {t("Create your first template")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href="/workouts/session/quick"
              className="block rounded-xl bg-brand/10 ring-1 ring-brand/30 hover:ring-brand/50 transition-all duration-200 active:scale-[0.99]"
            >
              <div className="px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-brand/20 flex items-center justify-center">
                    <svg className="size-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-medium text-brand text-sm sm:text-base">{t("Quick start")}</h2>
                    <p className="text-xs text-muted-foreground">{t("Start blank workout")}</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-between mt-3 mb-1">
              <h2 className="text-sm font-medium text-muted-foreground">{t("Templates")}</h2>
              <Link href="/workouts/new">
                <Button size="sm" className="bg-brand text-zinc-900 hover:bg-brand-hover active:scale-[0.97] transition-all font-medium">
                  <svg className="size-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("New Template")}
                </Button>
              </Link>
            </div>
            {templates.map((template: any) => (
              <Link
                key={template.templateId}
                href={`/workouts/t/${template.templateId}`}
                className="block rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-brand/30 transition-all duration-200 active:scale-[0.99]"
              >
                <div className="px-4 sm:px-5 py-3 sm:py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-medium text-foreground text-sm sm:text-base truncate">
                        {template.name}
                      </h2>
                      {template.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] sm:text-xs">
                        {template.targetMuscleGroups && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            💪 {template.targetMuscleGroups}
                          </span>
                        )}
                        {template.estimatedTime && (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-medium">
                            ⏱️ {template.estimatedTime} {t("min")}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="size-4 sm:size-5 text-muted-foreground shrink-0 self-end" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
