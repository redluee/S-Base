import { describe, expect, it } from "bun:test";
import { payeeClusters, payeeName } from "./breakdown-names";

describe("Finance breakdown payee names", () => {
  it("drops the payment service, legal forms, store numbers and punctuation", () => {
    expect(payeeName("Sample Club via Rabo Zakelijk Betaalverzoek")).toBe("sample club");
    expect(payeeName("Sample Stream by Collector")).toBe("sample stream");
    expect(payeeName("  Sample  Lab B.V. ")).toBe("sample lab");
    expect(payeeName("SAMPLE MARKET 1403")).toBe("sample market");
    expect(payeeName("1234")).toBe("1234");
  });

  it("clusters spelling variants and keeps unrelated payees apart", () => {
    const clusters = payeeClusters([
      "hr j example",
      "jan example",
      "samplestream",
      "sample stream",
      "sample gadgets",
      "other tickets",
      "sample market",
    ]);
    expect(clusters.get("jan example")).toBe(clusters.get("hr j example"));
    expect(clusters.get("sample stream")).toBe(clusters.get("samplestream"));
    expect(clusters.get("other tickets")).not.toBe(clusters.get("sample gadgets"));
  });
});
