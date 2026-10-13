import { t } from "@/lib/lang";

export function parseStoryJson(rawJson: string) {
  let data: unknown;
  try {
    data = JSON.parse(rawJson);
  } catch {
    throw new Error(t("Ongeldig JSON-formaat. Controleer de syntax."));
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(t("Ongeldige JSON structuur."));
  }

  const obj = data as Record<string, unknown>;

  const rawTitle = obj.title ?? obj.name ?? "";
  const title = String(rawTitle).trim();
  if (!title) {
    throw new Error(t("Titel van de story is verplicht in JSON."));
  }

  const rawTypeCode = obj.storyTypeCode ?? obj.type ?? obj.storyType ?? "US";
  const typeCode = String(rawTypeCode).trim().toUpperCase();

  const rawNum = obj.storyNumber ?? obj.number;
  const num = rawNum != null ? String(rawNum).trim() : undefined;

  const rawAsA = obj.asA ?? obj.as_a ?? obj.role;
  const asARole = rawAsA != null ? String(rawAsA).trim() : undefined;

  const rawIWant = obj.iWant ?? obj.i_want ?? obj.want;
  const iWantWens = rawIWant != null ? String(rawIWant).trim() : undefined;

  const rawSoThat = obj.soThat ?? obj.so_that ?? obj.purpose;
  const soThatDoel = rawSoThat != null ? String(rawSoThat).trim() : undefined;

  let learningOutcomes: number[] = [];
  const rawLUs = obj.learningOutcomes ?? obj.learning_outcomes ?? obj.lus ?? obj.lu;
  if (Array.isArray(rawLUs)) {
    learningOutcomes = rawLUs
      .map((n: unknown) => Number(n))
      .filter((n: number) => !isNaN(n) && n >= 1 && n <= 5);
  } else if (typeof rawLUs === "number" || typeof rawLUs === "string") {
    const parsed = Number(rawLUs);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) learningOutcomes = [parsed];
  }

  const statusStr = String(obj.status || "todo");
  const statusVal = (["todo", "in_progress", "done"].includes(statusStr) ? statusStr : "todo") as "todo" | "in_progress" | "done";

  let acceptance: { text: string; isCompleted?: boolean; indent?: number }[] = [];
  const rawAcceptance = obj.acceptanceCriteria ?? obj.acceptance_criteria;
  if (Array.isArray(rawAcceptance)) {
    acceptance = rawAcceptance
      .map((item: unknown) => {
        if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
        if (item && typeof item === "object") {
          const crit = item as Record<string, unknown>;
          const textVal = String(crit.text ?? crit.title ?? "").trim();
          return {
            text: textVal,
            isCompleted: Boolean(crit.isCompleted),
            indent: crit.indent ? 1 : 0,
          };
        }
        return null;
      })
      .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
  }

  let quality: { text: string; isCompleted?: boolean; indent?: number }[] = [];
  const rawQuality = obj.qualityCriteria ?? obj.quality_criteria;
  if (Array.isArray(rawQuality)) {
    quality = rawQuality
      .map((item: unknown) => {
        if (typeof item === "string") return { text: item.trim(), isCompleted: false, indent: 0 };
        if (item && typeof item === "object") {
          const crit = item as Record<string, unknown>;
          const textVal = String(crit.text ?? crit.title ?? "").trim();
          return {
            text: textVal,
            isCompleted: Boolean(crit.isCompleted),
            indent: crit.indent ? 1 : 0,
          };
        }
        return null;
      })
      .filter((item): item is { text: string; isCompleted: boolean; indent: number } => Boolean(item && item.text));
  }

  if (Array.isArray(obj.criteria)) {
    obj.criteria.forEach((c: unknown) => {
      if (!c || typeof c !== "object") return;
      const crit = c as Record<string, unknown>;
      const textVal = String(crit.text ?? crit.title ?? "").trim();
      if (!textVal) return;
      const critObj = { text: textVal, isCompleted: Boolean(crit.isCompleted), indent: crit.indent ? 1 : 0 };
      if (crit.type === "quality") {
        quality.push(critObj);
      } else {
        acceptance.push(critObj);
      }
    });
  }

  let evidence: { type: "link" | "github" | "document" | "app"; title: string; url: string }[] = [];
  const rawEvidence = obj.evidence ?? obj.evidenceList;
  if (Array.isArray(rawEvidence)) {
    evidence = rawEvidence
      .map((e: unknown) => {
        if (!e || typeof e !== "object") return null;
        const ev = e as Record<string, unknown>;
        const evTitle = String(ev.title ?? "").trim();
        const evUrl = String(ev.url ?? "").trim();
        const evTypeStr = String(ev.type ?? "link");
        const evType = (["link", "github", "document", "app"].includes(evTypeStr) ? evTypeStr : "link") as "link" | "github" | "document" | "app";
        return { type: evType, title: evTitle, url: evUrl };
      })
      .filter((e): e is { type: "link" | "github" | "document" | "app"; title: string; url: string } => Boolean(e && e.title && e.url));
  }

  return {
    storyTypeCode: typeCode,
    storyNumber: num,
    title,
    asA: asARole,
    iWant: iWantWens,
    soThat: soThatDoel,
    learningOutcomes,
    status: statusVal,
    acceptanceCriteria: acceptance,
    qualityCriteria: quality,
    evidence,
  };
}
