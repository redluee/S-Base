export function validateSlug(slug: string): void {
  if (!/^[a-z0-9-]{3,32}$/.test(slug)) {
    throw new Error("Invalid server slug: must be 3-32 chars, lowercase letters, digits, hyphens only");
  }
}

export function sanitizeCommand(cmd: string): string {
  return cmd.replace(/[\r\n;`$&|<>]/g, "").trim().slice(0, 512);
}

const ALLOWED_EXTENSIONS = [".jar", ".zip"];
export function validateFilename(filename: string): void {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new Error("Invalid file type");
  if (filename.includes("/") || filename.includes("..")) throw new Error("Invalid filename");
}
