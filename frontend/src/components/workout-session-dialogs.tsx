"use client";

import { t } from "@/lib/lang";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface WorkoutSessionDialogsProps {
  showLeaveWarning: boolean;
  setShowLeaveWarning: (show: boolean) => void;
  confirmLeave: () => void;
  showFinishedWarning: boolean;
  setShowFinishedWarning: (show: boolean) => void;
  proceedToSummary: () => void;
  showZeroRepsWarning: boolean;
  setShowZeroRepsWarning: (show: boolean) => void;
  handleZeroRepsConfirm: () => void;
}

export function WorkoutSessionDialogs({
  showLeaveWarning,
  setShowLeaveWarning,
  confirmLeave,
  showFinishedWarning,
  setShowFinishedWarning,
  proceedToSummary,
  showZeroRepsWarning,
  setShowZeroRepsWarning,
  handleZeroRepsConfirm,
}: WorkoutSessionDialogsProps) {
  return (
    <>
      <ConfirmDialog
        open={showLeaveWarning}
        title={t("Leave session?")}
        description={t("Je laatste wijzigingen zijn nog niet naar de server gestuurd. Ze blijven op dit apparaat bewaard en worden later alsnog gesynchroniseerd.")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Leave")}
        onCancel={() => setShowLeaveWarning(false)}
        onConfirm={confirmLeave}
        tone="destructive"
      />

      <ConfirmDialog
        open={showFinishedWarning}
        title={t("Incomplete sets")}
        description={t("You have sets that are not marked completed. Do you want to finish anyway?")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Finish")}
        onCancel={() => setShowFinishedWarning(false)}
        onConfirm={proceedToSummary}
      />

      <ConfirmDialog
        open={showZeroRepsWarning}
        title={t("Sets with 0 reps")}
        description={t("You have completed sets with 0 reps. Do you want to finish anyway?")}
        cancelLabel={t("Cancel")}
        confirmLabel={t("Finish")}
        onCancel={() => setShowZeroRepsWarning(false)}
        onConfirm={handleZeroRepsConfirm}
      />
    </>
  );
}
