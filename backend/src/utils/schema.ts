import { t } from "elysia";

export const literals = <T extends string>(values: readonly T[]) => t.Union(values.map((v) => t.Literal(v)));
