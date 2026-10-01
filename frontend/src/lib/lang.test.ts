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
