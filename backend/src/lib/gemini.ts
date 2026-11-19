import { AppError } from "../utils/errors";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-4-hydrogen@low"];
const CALL_TIMEOUT_MS = 30_000;
const TOTAL_BUDGET_MS = 80_000;
const MIN_CALL_MS = 5_000;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export interface JsonGenerationRequest {
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
}

export type JsonGenerator = (request: JsonGenerationRequest) => Promise<unknown>;

interface ModelSpec {
  name: string;
  thinkingLevel?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface GeminiErrorDetail {
  "@type"?: string;
  retryDelay?: string;
  violations?: { quotaId?: string }[];
}

type Outcome = "busy" | "failed" | "invalid";

const cooldowns = new Map<string, number>();

export function resetGeminiCooldowns() {
  cooldowns.clear();
}

export function parseModelChain(value: string | undefined): ModelSpec[] {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return (entries.length ? entries : DEFAULT_MODELS).map((entry) => {
    const [name, thinkingLevel] = entry.split("@").map((part) => part.trim());
    return thinkingLevel ? { name, thinkingLevel } : { name };
  });
}

export function parseResponseJson(body: GeminiResponse): unknown {
  const text = (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, ""),
  );
}

export function rateLimitCooldown(errorBody: string): number {
  let details: GeminiErrorDetail[] = [];
  try {
    details = (JSON.parse(errorBody) as { error?: { details?: GeminiErrorDetail[] } }).error?.details ?? [];
  } catch {
    return MINUTE;
  }
  const quotaIds = details.flatMap((detail) => detail.violations ?? []).map((violation) => violation.quotaId ?? "");
  if (quotaIds.some((id) => id.includes("PerDay"))) return HOUR;
  const retryDelay = details.find((detail) => detail.retryDelay)?.retryDelay;
  const seconds = Number.parseFloat(retryDelay ?? "");
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) * SECOND : MINUTE;
}

function cooldownFor(status: number, errorBody: string): number {
  if (status === 429) return rateLimitCooldown(errorBody);
  if (status === 404) return 24 * HOUR;
  return 30 * SECOND;
}

function availableModels(chain: ModelSpec[], now: number): ModelSpec[] {
  const ready = chain.filter((model) => (cooldowns.get(model.name) ?? 0) <= now);
  return ready.length ? ready : chain;
}

function requestBody({ instructions, input, schema }: JsonGenerationRequest, model: ModelSpec): string {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: instructions }] },
    contents: [{ role: "user", parts: [{ text: input }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: 0.2,
      ...(model.thinkingLevel ? { thinkingConfig: { thinkingLevel: model.thinkingLevel } } : {}),
    },
  });
}

async function callModel(
  model: ModelSpec,
  apiKey: string,
  body: string,
  timeoutMs: number,
): Promise<{ value: unknown } | { outcome: Outcome; fatal?: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model.name)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.warn(`Gemini ${model.name} request failed:`, err instanceof Error ? err.message : err);
    cooldowns.set(model.name, Date.now() + MINUTE);
    return { outcome: "busy" };
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.warn(`Gemini ${model.name} responded ${res.status}: ${errorBody.slice(0, 300)}`);
    if (res.status === 401 || res.status === 403) return { outcome: "failed", fatal: true };
    cooldowns.set(model.name, Date.now() + cooldownFor(res.status, errorBody));
    return { outcome: res.status === 429 || res.status >= 500 ? "busy" : "failed" };
  }

  try {
    return { value: parseResponseJson((await res.json()) as GeminiResponse) };
  } catch {
    console.warn(`Gemini ${model.name} returned invalid JSON`);
    return { outcome: "invalid" };
  }
}

export const generateJson: JsonGenerator = async (request) => {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) throw new AppError(503, "ai.notConfigured");

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const outcomes: Outcome[] = [];
  for (const model of availableModels(parseModelChain(process.env.GOOGLE_AI_MODEL), Date.now())) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_CALL_MS) break;
    const result = await callModel(model, apiKey, requestBody(request, model), Math.min(CALL_TIMEOUT_MS, remaining));
    if ("value" in result) return result.value;
    outcomes.push(result.outcome);
    if (result.fatal) break;
  }

  if (outcomes.includes("busy")) throw new AppError(503, "ai.busy");
  if (outcomes.includes("invalid")) throw new AppError(502, "ai.invalidResponse");
  throw new AppError(502, "ai.requestFailed");
};
