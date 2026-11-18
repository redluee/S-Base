import type { ReactNode } from "react";
import { type Inline, parseMarkdown } from "./markdown-parser";

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === "bold") return <strong key={i}>{node.text}</strong>;
    if (node.type === "link") {
      return (
        <a
          key={i}
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-brand underline underline-offset-2"
        >
          {node.text}
        </a>
      );
    }
    return node.text;
  });
}

export function LightMarkdown({ source }: { source: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words text-foreground">
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "paragraph") return <p key={i}>{renderInline(block.children)}</p>;
        const List = block.type === "bullets" ? "ul" : "ol";
        return (
          <List key={i} className={block.type === "bullets" ? "list-disc pl-5" : "list-decimal pl-5"}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
