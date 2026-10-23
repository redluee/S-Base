import type {
  FinanceData,
  FinanceImportSelection,
  FinanceImportSource,
  FinanceAccountType,
} from "@backend/types/finance";

export interface ImportChoice {
  target: string;
  name: string;
  type: FinanceAccountType;
  extendOpening: boolean;
  dates: string[];
}
export function importRows(
  source: FinanceImportSource,
  data: FinanceData,
  target: string,
) {
  return source.balances.map((balance) => {
    const existing = data.observations.find(
      (observation) =>
        observation.accountId === Number(target) &&
        observation.date === balance.date,
    );
    const expectedCents = existing?.balanceCents ?? null;
    return {
      ...balance,
      expectedCents,
      state:
        expectedCents === balance.balanceCents
          ? ("same" as const)
          : expectedCents === null
            ? ("new" as const)
            : ("conflict" as const),
    };
  });
}
export function defaultImportChoice(
  source: FinanceImportSource,
  data: FinanceData,
  target = "",
): ImportChoice {
  return {
    target,
    name: "",
    type: source.suggestedType ?? "current",
    extendOpening: false,
    dates: importRows(source, data, target)
      .filter((row) => row.state === "new")
      .map((row) => row.date),
  };
}
export function importSelections(
  sources: FinanceImportSource[],
  choices: Record<string, ImportChoice>,
  data: FinanceData,
): FinanceImportSelection[] {
  return sources.flatMap((source) => {
    const choice = choices[source.sourceKey];
    if (!choice?.target || !choice.dates.length) return [];
    return [
      {
        sourceKey: source.sourceKey,
        ...(choice.target === "new"
          ? { newAccount: { name: choice.name, type: choice.type } }
          : { accountId: Number(choice.target) }),
        extendOpening: choice.extendOpening,
        entries: importRows(source, data, choice.target)
          .filter((row) => choice.dates.includes(row.date))
          .map((row) => ({ date: row.date, expectedCents: row.expectedCents })),
      },
    ];
  });
}
