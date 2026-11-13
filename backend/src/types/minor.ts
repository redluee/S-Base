export type { SelfEvaluationInput, TeacherAssessmentInput } from "../modules/minor/minor-evaluations";
export type { SprintInput } from "../modules/minor/minor-sprints";
export type { StoryInput } from "../modules/minor/minor-stories";

import type { MinorSchedule } from "../modules/minor/minor-schedule";

export type SprintDates = ReturnType<MinorSchedule["calculateSprintDates"]>;
