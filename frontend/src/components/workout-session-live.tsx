"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineAlert } from "@/components/ui/inline-alert";
import { FileText } from "lucide-react";
import { ExerciseHistoryModal } from "@/components/exercise-history-modal";
import { WorkoutCompletionSummary } from "@/components/workout-completion-summary";
import { RepTimerModal } from "@/components/rep-timer-modal";
import { SessionConflictDialog } from "@/components/session-conflict-dialog";
import { parseSessionConflict, type ActiveSessionInfo } from "@/lib/session-conflict";
import type { FullWorkoutSession } from "@backend/types/shared";
import { getOfflineSession, ensureExerciseIds } from "@/lib/offline-workout";
import { calculateTotalVolume } from "@/components/workout-session-helpers";
import { WorkoutSessionHeader } from "@/components/workout-session-header";
import { WorkoutSessionExerciseList } from "@/components/workout-session-exercise-list";
import { WorkoutSessionDialogs } from "@/components/workout-session-dialogs";
import { useElapsedTime } from "@/components/use-elapsed-time";
import { usePreviousSets } from "@/components/use-previous-sets";
import { useRestTimer, useSessionWakeLock } from "@/components/use-rest-timer";
import { useRepTimer } from "@/components/use-rep-timer";
import { useSessionSetActions } from "@/components/use-session-set-actions";
import { useSessionExerciseActions } from "@/components/use-session-exercise-actions";
import { useSessionFinish } from "@/components/use-session-finish";
import { useSessionSync } from "@/components/use-session-sync";

export function WorkoutSessionLive({
  session: initialSession,
  autoFinish = false,
}: {
  session?: FullWorkoutSession | null;
  userId?: number;
  autoFinish?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = useState<FullWorkoutSession | null>(() => {
    if (initialSession?.sessionId) {
      const offlineData = getOfflineSession(initialSession.sessionId);
      if (offlineData?.pendingSync && offlineData.session) {
        return {
          ...initialSession,
          ...offlineData.session,
          exercises: ensureExerciseIds(offlineData.session.exercises ?? initialSession.exercises ?? []),
        };
      }
    }
    return initialSession ?? null;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const nameCancelRef = useRef(false);

  const [isSummaryView, setIsSummaryView] = useState(false);
  const isPaused = Boolean(session?.pausedAt) && !session?.completedAt;
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const loadedSessionId = session?.sessionId;
  const [elapsed, setElapsed] = useElapsedTime(session, sessionRef, isPaused, isSummaryView);
  const [previousSetsMap, setPreviousSetsMap] = usePreviousSets(session);
  const restTimer = useRestTimer(session?.exercises);
  const { restActive, restSecondsLeft, restTotalSeconds, activeRestExerciseIdx, activeRestSetIdx, soundEnabled, toggleSound } = restTimer;
  useSessionWakeLock(Boolean(session?.sessionId && !isPaused && !isSummaryView && !session?.completedAt), restActive);

  // UI state
  const [sessionName, setSessionName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeMenuExerciseId, setActiveMenuExerciseId] = useState<number | null>(null);
  const [activeEquipmentMenuExerciseId, setActiveEquipmentMenuExerciseId] = useState<number | null>(null);

  // Exercise history modal state
  const [historyExerciseName, setHistoryExerciseName] = useState<string | null>(null);
  const [historyExerciseEquipment, setHistoryExerciseEquipment] = useState<string | null>(null);

  const handleSetHistoryExercise = (name: string | null, equipment?: string | null) => {
    setHistoryExerciseName(name);
    setHistoryExerciseEquipment(equipment || null);
  };

  // Leave confirmation state
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const [startConflict, setStartConflict] = useState<ActiveSessionInfo | null>(null);
  const creatingRef = useRef(false);

  // Fetch initial session if not provided
  const createSession = useCallback(async (force = false) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setCreateError(null);
    try {
      const s = await api.workouts.sessions.create(undefined, force);
      setSession(s);
      router.replace(`/workouts/session/${s.sessionId}`);
    } catch (err) {
      const active = parseSessionConflict(err);
      if (active) {
        setStartConflict(active);
      } else {
        console.error("Failed to create session", err);
        setCreateError(t("Failed to start workout. Please try again."));
      }
    } finally {
      creatingRef.current = false;
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!session && !createError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      createSession();
    }
  }, [session, createSession, createError]);

  const { unsynced, refreshUnsynced, saveExercises, togglePause, saveWorkoutTitle, syncVersionRef, syncPromiseChain, bypassWarningRef } =
    useSessionSync({ session, setSession, sessionRef, setSaving, setElapsed, sessionName, setIsEditingName, isSummaryView });

  const finish = useSessionFinish({
    session,
    setSession,
    sessionRef,
    loadedSessionId,
    sessionName,
    previousSetsMap,
    elapsed,
    setElapsed,
    isSummaryView,
    setIsSummaryView,
    setSaving,
    setActionError,
    refreshUnsynced,
    syncVersionRef,
    syncPromiseChain,
    bypassWarningRef,
    autoFinish,
  });
  const { summaryNotes, setSummaryNotes } = finish;

  // Sync name and notes only when a different session is loaded, never on set updates
  useEffect(() => {
    const current = sessionRef.current;
    if (current) {
      setSessionName(current.name || t("Workout Session"));
      setSummaryNotes(current.notes || "");
    }
  }, [loadedSessionId, setSummaryNotes]);

  const setActions = useSessionSetActions({
    session,
    setSession,
    saveExercises,
    previousSetsMap,
    activeRestExerciseIdx,
    activeRestSetIdx,
    startRestTimer: restTimer.startRestTimer,
    stopRestTimer: restTimer.stopRestTimer,
  });

  const exerciseActions = useSessionExerciseActions({ session, setSession, saveExercises, setPreviousSetsMap });

  const { activeRepTimer, closeRepTimer, handleStartRepTimer, handleFinishRepTimer } = useRepTimer({
    session,
    sessionRef,
    loadedSessionId,
    completeSet: setActions.updateSetAndComplete,
  });

  function handleBackClick(e: React.MouseEvent) {
    e.preventDefault();
    if (session?.completedAt) {
      bypassWarningRef.current = true;
      router.push(`/workouts/history/${session.sessionId}`);
    } else if (unsynced) {
      setShowLeaveWarning(true);
    } else {
      bypassWarningRef.current = true;
      router.push("/workouts");
    }
  }

  function confirmLeave() {
    bypassWarningRef.current = true;
    router.push("/workouts");
  }


  const exercises = session?.exercises ?? [];

  if (!session && startConflict) {
    return (
      <SessionConflictDialog
        key={startConflict.sessionId}
        session={startConflict}
        busy={loading}
        onResume={() => router.replace(`/workouts/session/${startConflict.sessionId}`)}
        onStartNew={async () => {
          setStartConflict(null);
          await createSession();
        }}
        onCancel={() => router.push("/workouts")}
      />
    );
  }

  if (!session && createError) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
        <InlineAlert>{createError}</InlineAlert>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => createSession()} className="min-h-11 bg-brand text-zinc-950 hover:bg-brand-hover font-semibold">
            {t("Opnieuw proberen")}
          </Button>
          <Button variant="outline" onClick={() => router.push("/workouts")} className="min-h-11">
            {t("Terug naar workouts")}
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin size-8 border-4 border-brand border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">{t("Starting workout session...")}</span>
      </div>
    );
  }

  if (isSummaryView) {
    return (
      <>
        <WorkoutCompletionSummary
          error={actionError}
          sessionName={sessionName}
          setSessionName={setSessionName}
          summaryNotes={summaryNotes}
          setSummaryNotes={setSummaryNotes}
          summaryHours={finish.summaryHours}
          setSummaryHours={finish.setSummaryHours}
          summaryMinutes={finish.summaryMinutes}
          setSummaryMinutes={finish.setSummaryMinutes}
          summarySeconds={finish.summarySeconds}
          setSummarySeconds={finish.setSummarySeconds}
          totalVolume={calculateTotalVolume(session)}
          personalRecords={finish.personalRecords}
          saving={saving}
          onSave={finish.saveWorkoutSummary}
          onCancel={() => setIsSummaryView(false)}
          onDiscard={() => finish.setShowDiscardConfirm(true)}
          savedLocally={finish.savedLocally}
          onLeave={() => {
            bypassWarningRef.current = true;
            router.push("/workouts");
          }}
        />
        <ConfirmDialog
          open={finish.showDiscardConfirm}
          title={t("Discard Workout")}
          description={t("Are you sure you want to delete this active workout session? This cannot be undone.")}
          cancelLabel={t("Cancel")}
          confirmLabel={t("Delete")}
          onCancel={() => finish.setShowDiscardConfirm(false)}
          onConfirm={finish.discardWorkout}
          tone="destructive"
          busy={finish.discarding}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <WorkoutSessionHeader
        session={session}
        sessionName={sessionName}
        setSessionName={setSessionName}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        nameCancelRef={nameCancelRef}
        saveWorkoutTitle={saveWorkoutTitle}
        handleBackClick={handleBackClick}
        elapsed={elapsed}
        isPaused={isPaused}
        togglePause={togglePause}
        updateElapsedSeconds={finish.updateElapsedSeconds}
        saving={saving}
        handleSaveHistoryEdit={finish.handleSaveHistoryEdit}
        handleFinishClick={finish.handleFinishClick}
        unsynced={unsynced}
        actionError={actionError}
      />

      {/* Workout Notes Card - Only in edit mode of a completed session */}
      {session?.completedAt ? (
        <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-3.5 mb-6">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            <FileText className="size-3.5 text-brand" />
            <span>{t("Notes")}</span>
          </div>
          <Textarea
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            placeholder={t("Write session feedback, how you felt, details...")}
            className="bg-white/5 border-border min-h-[60px] text-xs text-foreground focus-visible:ring-brand"
          />
        </div>
      ) : null}

      <WorkoutSessionExerciseList
        exercises={exercises}
        cardProps={{
          saving,
          replacingExerciseId: exerciseActions.replacingExerciseId,
          setReplacingExerciseId: exerciseActions.setReplacingExerciseId,
          replaceName: exerciseActions.replaceName,
          setReplaceName: exerciseActions.setReplaceName,
          replaceExercise: exerciseActions.replaceExercise,
          onStartEditing: exerciseActions.startEditingExercise,
          updateCategory: exerciseActions.updateCategory,
          updateEquipment: exerciseActions.updateEquipment,
          updateIsAssisted: exerciseActions.updateIsAssisted,
          removeExercise: exerciseActions.removeExercise,
          moveExerciseUpDirect: exerciseActions.moveExerciseUpDirect,
          moveExerciseDownDirect: exerciseActions.moveExerciseDownDirect,
          updateSet: setActions.updateSet,
          addSet: setActions.addSet,
          toggleSetCompleted: setActions.toggleSetCompleted,
          removeSet: setActions.removeSet,
          previousSetsMap,
          activeRestExerciseIdx,
          activeRestSetIdx,
          restSecondsLeft,
          restTotalSeconds,
          restActive,
          lastCompletedSet: setActions.lastCompletedSet,
          activeMenuExerciseId,
          setActiveMenuExerciseId,
          activeEquipmentMenuExerciseId,
          setActiveEquipmentMenuExerciseId,
          setHistoryExerciseName: handleSetHistoryExercise,
          startRestTimer: restTimer.startRestTimer,
          stopRestTimer: restTimer.stopRestTimer,
          adjustRestTimer: restTimer.adjustRestTimer,
          onStartRepTimer: handleStartRepTimer,
          highlightZeroReps: finish.highlightZeroReps,
          soundEnabled,
          toggleSound,
        }}
        addControls={{
          showAddExercise: exerciseActions.showAddExercise,
          setShowAddExercise: exerciseActions.setShowAddExercise,
          newExerciseName: exerciseActions.newExerciseName,
          setNewExerciseName: exerciseActions.setNewExerciseName,
          addExercise: exerciseActions.addExercise,
          setUnknownExerciseDraft: exerciseActions.setUnknownExerciseDraft,
        }}
        unknownExerciseDraft={exerciseActions.unknownExerciseDraft}
        setUnknownExerciseDraft={exerciseActions.setUnknownExerciseDraft}
        addExerciseFromDraft={exerciseActions.addExerciseFromDraft}
        editingExerciseIdx={exerciseActions.editingExerciseIdx}
        editingExerciseDraft={exerciseActions.editingExerciseDraft}
        setEditingExerciseIdx={exerciseActions.setEditingExerciseIdx}
        setEditingExerciseDraft={exerciseActions.setEditingExerciseDraft}
        saveEditedExercise={exerciseActions.saveEditedExercise}
      />

      <WorkoutSessionDialogs
        showLeaveWarning={showLeaveWarning}
        setShowLeaveWarning={setShowLeaveWarning}
        confirmLeave={confirmLeave}
        showFinishedWarning={finish.showFinishedWarning}
        setShowFinishedWarning={finish.setShowFinishedWarning}
        proceedToSummary={finish.proceedToSummary}
        showZeroRepsWarning={finish.showZeroRepsWarning}
        setShowZeroRepsWarning={finish.setShowZeroRepsWarning}
        handleZeroRepsConfirm={finish.handleZeroRepsConfirm}
      />

      {/* Exercise History View Modal Overlay */}
      {historyExerciseName && (
        <ExerciseHistoryModal
          exerciseName={historyExerciseName}
          equipment={historyExerciseEquipment ?? undefined}
          onClose={() => handleSetHistoryExercise(null, null)}
        />
      )}

      {/* Active Rep Timer Modal Overlay */}
      {activeRepTimer && (
        <RepTimerModal
          key={`${activeRepTimer.exIdx}-${activeRepTimer.setIdx}`}
          sessionId={session.sessionId}
          exIdx={activeRepTimer.exIdx}
          setIdx={activeRepTimer.setIdx}
          restored={activeRepTimer.restored ?? null}
          exerciseName={activeRepTimer.exerciseName}
          setNumber={activeRepTimer.setNumber}
          targetDurationSeconds={activeRepTimer.targetDurationSeconds}
          onFinish={handleFinishRepTimer}
          onClose={closeRepTimer}
        />
      )}
    </div>
  );
}
