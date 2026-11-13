export const IGNORED_SEARCH_CHARACTERS = [" ", "-", "/"] as const;

export function normalizeSearchString(q: string): string {
  return IGNORED_SEARCH_CHARACTERS.reduce((text, char) => text.replaceAll(char, ""), q).toLowerCase();
}
