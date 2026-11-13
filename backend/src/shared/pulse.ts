export const UPDATE_STEP_PHASES = [
  "repositories",
  "resolving",
  "downloading",
  "installing",
  "cleanup",
  "verifying",
  "complete",
] as const;
export type UpdateStepPhase = (typeof UPDATE_STEP_PHASES)[number];

export type UpdatePhase = "starting" | UpdateStepPhase | "nothing" | "error";
