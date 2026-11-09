import { describe, expect, it } from "bun:test";
import { t } from "./lang";

describe("Frontend translation utility t()", () => {
  it("translates known Dutch keys", () => {
    expect(t("Recipe name is required.")).toBe("Receptnaam is verplicht.");
    expect(t("Basic Info")).toBe("Basisgegevens");
    expect(t("Username")).toBe("Gebruikersnaam");
  });

  it("replaces parameters in translation strings", () => {
    const res = t("No recipes with status \"{status}\".", { status: "proberen" });
    expect(res).toBe("Geen recepten met status \"proberen\".");
  });

  it("falls back to raw key if translation is missing", () => {
    expect(t("NonExistentKey123")).toBe("NonExistentKey123");
  });

  it("translates workout UI strings that used to stay English", () => {
    expect(t("Add Set")).toBe("Set toevoegen");
    expect(t("reps")).toBe("herh.");
    expect(t("exercises")).toBe("oefeningen");
    expect(t("Leave session?")).toBe("Sessie verlaten?");
    expect(t("Remove this exercise?")).toBe("Deze oefening verwijderen?");
  });
});

describe("workout error keys", () => {
  it("translates backend error keys with parameters", () => {
    expect(t("workout.sessionNotFound")).toBe("Training niet gevonden.");
    expect(t("workout.tooManySets", { exerciseName: "Squat", max: "50" })).toBe("Oefening \"Squat\" mag maximaal 50 sets hebben.");
    expect(t("workout.measurementDateExists")).toBe("Er bestaat al een meting op deze datum.");
  });
});

describe("minecraft error keys", () => {
  it("translates backend error keys with parameters", () => {
    expect(t("minecraft.serverNotFound")).toBe("Server niet gevonden");
    expect(t("minecraft.versionNotFound", { version: "1.21" })).toBe("Versie 1.21 niet gevonden.");
  });
});

describe("minor error keys", () => {
  it("translates minor backend error keys", () => {
    expect(t("minor.sprintNotFound")).toBe("Sprint niet gevonden.");
    expect(t("minor.invalidDate")).toBe("Ongeldige datum. Gebruik het formaat JJJJ-MM-DD.");
  });
});

describe("finance error keys", () => {
  it("translates finance backend error keys", () => {
    expect(t("finance.accountNotFound")).toBe("Deze rekening is niet gevonden of is niet van jou.");
    expect(t("finance.invalidPeriod")).toBe("Kies een geldige periode.");
    expect(t("finance.import.stale")).not.toBe("finance.import.stale");
    expect(t("finance.staleBalance")).not.toBe("finance.staleBalance");
  });
});
