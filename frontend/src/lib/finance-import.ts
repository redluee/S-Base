import type {
  FinanceData,
  FinanceImportSelection,
  FinanceImportSource,
  FinanceAccountType,
  FinanceImportFormat,
} from "@backend/types/finance";

export function detectImportFormat(content: string): FinanceImportFormat {
  return content.replace(/^\uFEFF/, "").trimStart().startsWith("<") ? "camt053" : "ing-csv";
}

export async function readImportFile(file: File): Promise<string> {
  if (!/\.(csv|xml)$/i.test(file.name)) throw new Error("finance.import.fileType");
  if (file.size > 2 * 1024 * 1024) throw new Error("finance.import.size");
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    const content = new TextDecoder("windows-1252").decode(bytes);
    if (detectImportFormat(content) === "camt053") throw new Error("finance.import.xml");
    return content;
  }
}

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
    name: source.suggestedName ?? "",
    type: source.suggestedType ?? "current",
    extendOpening: false,
    dates: importRows(source, data, target)
      .filter((row) => row.state !== "conflict")
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
