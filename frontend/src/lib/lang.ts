import { commonNl } from "./common-lang";
import { financeImportNl } from "./finance-import-lang";
import { financeNl } from "./finance-lang";
import { minecraftNl } from "./minecraft-lang";
import { minorNl } from "./minor-lang";
import { pulseNl } from "./pulse-lang";
import { cashflowNl } from "./cashflow-lang";
import { recipesNl } from "./recipes-lang";
import { resumeNl } from "./resume-lang";
import { workoutNl } from "./workout-lang";

const nl: Record<string, string> = {
  ...commonNl,
  ...cashflowNl,
  ...minecraftNl,
  ...minorNl,
  ...pulseNl,
  ...recipesNl,
  ...resumeNl,
  ...workoutNl,
  ...financeNl,
  ...financeImportNl,
};

export function t(key: string, params?: Record<string, string>): string {
  let text = nl[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
