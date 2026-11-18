import { describe, expect, it } from "bun:test";
import { parseInline, parseMarkdown, safeHref } from "./markdown-parser";

describe("safeHref", () => {
  it("allows http, https and mailto only", () => {
    expect(safeHref("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:a@example.com")).toBe("mailto:a@example.com");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("/relative")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
});

describe("parseInline", () => {
  it("parses bold, links and bare urls", () => {
    expect(parseInline("a **b** [c](https://x.nl) https://y.nl.")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", text: "b" },
      { type: "text", text: " " },
      { type: "link", text: "c", href: "https://x.nl" },
      { type: "text", text: " " },
      { type: "link", text: "https://y.nl", href: "https://y.nl" },
      { type: "text", text: "." },
    ]);
  });

  it("keeps unsafe links as plain text", () => {
    expect(parseInline("[x](javascript:alert(1))").map((n) => n.type)).not.toContain("link");
    expect(parseInline("[x](javascript:alert)")).toEqual([{ type: "text", text: "[x](javascript:alert)" }]);
  });

  it("leaves unmatched markers alone", () => {
    expect(parseInline("2 ** 3")).toEqual([{ type: "text", text: "2 ** 3" }]);
  });
});

describe("parseMarkdown", () => {
  it("groups list lines and keeps paragraphs", () => {
    const blocks = parseMarkdown("Intro\n- een\n- twee\n\n1. a\n2) b\ntekst");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "bullets", "numbers", "paragraph"]);
    const bullets = blocks[1];
    expect(bullets.type === "bullets" && bullets.items).toHaveLength(2);
    const numbers = blocks[2];
    expect(numbers.type === "numbers" && numbers.items).toHaveLength(2);
  });

  it("returns nothing for empty input and handles CRLF", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("- a\r\n- b")).toHaveLength(1);
  });
});
