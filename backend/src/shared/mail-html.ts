const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const URL_OR_DOMAIN_PATTERN = /(https?:\/\/[^\s<"']+)|(\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b)/g;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function textToHtml(text: string): string {
  const linked = escapeHtml(text).replace(URL_OR_DOMAIN_PATTERN, (match, httpUrl, bareDomain) => {
    const href = httpUrl ?? `https://${bareDomain}`;
    return `<a href="${href}">${match}</a>`;
  });
  return linked.replace(/\n/g, "<br>");
}
