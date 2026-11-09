import { t } from "elysia";

const open = { additionalProperties: true };
const optText = t.Optional(t.Nullable(t.String()));
const optNumber = t.Optional(t.Nullable(t.Number()));

const sprintStatus = t.Union([t.Literal("planned"), t.Literal("active"), t.Literal("completed")]);
const storyStatus = t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done")]);
const evidenceType = t.Union([t.Literal("link"), t.Literal("github"), t.Literal("document"), t.Literal("app")]);

export const idParams = t.Object({ id: t.Numeric() });

export const calculateDatesQuery = t.Object({
  startDate: t.Optional(t.String()),
  durationDays: t.Optional(t.Numeric()),
});

const sprintFields = {
  sprintNumber: optText,
  name: optText,
  endDate: optText,
  durationDays: optNumber,
  showAndGrowDate: optText,
  status: t.Optional(t.Nullable(sprintStatus)),
};

export const sprintCreateBody = t.Object({ startDate: t.String(), ...sprintFields });

export const sprintUpdateBody = t.Object({
  startDate: t.Optional(t.String()),
  extendedDays: optNumber,
  extensionReason: optText,
  ...sprintFields,
});

export const importBody = t.Record(t.String(), t.Unknown());

const criterion = t.Object(
  {
    id: t.Optional(t.Number()),
    text: t.String(),
    isCompleted: t.Optional(t.Boolean()),
    indent: t.Optional(t.Number()),
  },
  open,
);

const evidence = t.Object(
  { id: t.Optional(t.Number()), type: t.Optional(evidenceType), title: t.String(), url: t.String() },
  open,
);

const link = t.Object({ url: t.String(), title: t.Optional(t.String()), name: t.Optional(t.String()) }, open);

const presentationData = t.Object(
  {
    enabled: t.Optional(t.Boolean()),
    layout: t.Optional(
      t.Union([t.Literal("auto"), t.Literal("split"), t.Literal("media"), t.Literal("bullets"), t.Literal("demo")]),
    ),
    bullets: t.Optional(t.Array(t.String())),
    listStyle: t.Optional(t.Union([t.Literal("bullets"), t.Literal("steps")])),
    summary: t.Optional(t.String()),
    demoUrl: t.Optional(t.String()),
    demoTitle: t.Optional(t.String()),
    images: t.Optional(t.Array(t.Object({ url: t.String(), caption: t.Optional(t.String()) }, open))),
    links: t.Optional(t.Array(link)),
    websites: t.Optional(t.Array(link)),
    documents: t.Optional(t.Array(t.Object({ title: t.String(), url: t.String() }, open))),
    notes: t.Optional(t.String()),
  },
  open,
);

const storyFields = {
  storyTypeCode: t.Optional(t.String()),
  storyNumber: optText,
  asA: optText,
  iWant: optText,
  soThat: optText,
  learningOutcomes: t.Optional(t.Array(t.Number())),
  status: t.Optional(storyStatus),
  orderIndex: t.Optional(t.Number()),
  presentationData: t.Optional(t.Nullable(presentationData)),
  acceptanceCriteria: t.Optional(t.Array(criterion)),
  qualityCriteria: t.Optional(t.Array(criterion)),
  evidence: t.Optional(t.Array(evidence)),
};

export const storyCreateBody = t.Object({ title: t.String(), sprintId: optNumber, ...storyFields });
export const storyUpdateBody = t.Object({ title: t.Optional(t.String()), sprintId: optNumber, ...storyFields });
export const reorderBody = t.Object({ storyIds: t.Array(t.Number()) });
export const toggleBody = t.Object({ isCompleted: t.Boolean() });

export const selfEvaluationsBody = t.Object({
  evaluations: t.Array(
    t.Object({
      learningOutcome: t.Number(),
      level: t.Union([t.Literal("V"), t.Literal("NV"), t.Literal("-")]),
      argumentation: optText,
    }),
  ),
});

export const teacherAssessmentsBody = t.Object({
  assessments: t.Array(
    t.Object({
      learningOutcome: t.Number(),
      assessment: t.Union([t.Literal("V"), t.Literal("O"), t.Literal("-")]),
      notes: optText,
      evaluatedAt: optText,
    }),
  ),
});

const feedbackFields = { orderIndex: t.Optional(t.Number()) };
export const feedbackCreateBody = t.Object({
  date: t.String(),
  fromWhom: t.String(),
  feedback: t.String(),
  action: t.String(),
  ...feedbackFields,
});
export const feedbackUpdateBody = t.Object({
  date: t.Optional(t.String()),
  fromWhom: t.Optional(t.String()),
  feedback: t.Optional(t.String()),
  action: t.Optional(t.String()),
  ...feedbackFields,
});

export const reflectionBody = t.Object({
  date: t.Optional(t.String()),
  whatLearned: t.Optional(t.String()),
  whatRetained: t.Optional(t.String()),
  whatChange: t.Optional(t.String()),
});

export const vacationCreateBody = t.Object({ name: t.String(), startDate: t.String(), endDate: t.String() });
export const vacationUpdateBody = t.Object({
  name: t.Optional(t.String()),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
});

const qualityCriterion = t.Union([t.String(), t.Object({ text: t.String(), indent: t.Optional(t.Number()) }, open)]);
const storyTypeFields = {
  description: optText,
  color: optText,
  defaultQualityCriteria: t.Optional(t.Array(qualityCriterion)),
};
export const storyTypeCreateBody = t.Object({ code: t.String(), name: t.String(), ...storyTypeFields });
export const storyTypeUpdateBody = t.Object({
  code: t.Optional(t.String()),
  name: t.Optional(t.String()),
  ...storyTypeFields,
});

export const peerHelpCreateBody = t.Object({
  sprintId: optNumber,
  date: t.String(),
  peerName: t.String(),
  description: t.String(),
  links: optText,
});
export const peerHelpUpdateBody = t.Object({
  sprintId: optNumber,
  date: t.Optional(t.String()),
  peerName: t.Optional(t.String()),
  description: t.Optional(t.String()),
  links: optText,
});

export const settingsBody = t.Object({ portfolioUrl: optText, lastName: optText });

export const uploadBody = t.Object({ file: t.File() });
