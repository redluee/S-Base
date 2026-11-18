export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string };

export type MarkdownBlock =
  | { type: "paragraph"; children: Inline[] }
  | { type: "bullets" | "numbers"; items: Inline[][] };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeHref(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

const INLINE = /\*\*([^*\n]+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const pushText = (text: string) => {
    if (text) out.push({ type: "text", text });
  };
  for (const match of source.matchAll(INLINE)) {
    const index = match.index ?? 0;
    const [whole, bold, label, href, bare] = match;
    if (bold !== undefined) {
      pushText(source.slice(last, index));
      out.push({ type: "bold", text: bold });
    } else if (label !== undefined && href !== undefined) {
      const safe = safeHref(href);
      if (!safe) continue;
      pushText(source.slice(last, index));
      out.push({ type: "link", text: label, href: safe });
    } else if (bare !== undefined) {
      const safe = safeHref(bare);
      if (!safe) continue;
      pushText(source.slice(last, index));
      out.push({ type: "link", text: bare, href: safe });
    }
    last = index + whole.length;
  }
  pushText(source.slice(last));
  return out;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) continue;
    const bullet = BULLET.exec(line);
    const number = bullet ? null : NUMBER.exec(line);
    const listType = bullet ? "bullets" : number ? "numbers" : null;
    const text = bullet?.[1] ?? number?.[1];
    if (listType && text !== undefined) {
      const previous = blocks.at(-1);
      const item = parseInline(text);
      if (previous && previous.type === listType) previous.items.push(item);
      else blocks.push({ type: listType, items: [item] });
    } else {
      blocks.push({ type: "paragraph", children: parseInline(line.trim()) });
    }
  }
  return blocks;
}
