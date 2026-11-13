export function isImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  if (
    clean.startsWith("/api/uploads/") ||
    clean.startsWith("/uploads/") ||
    clean.startsWith("data:image/") ||
    clean.startsWith("blob:")
  ) {
    return true;
  }
  const pathWithoutQuery = clean.split(/[?#]/)[0];
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(pathWithoutQuery);
}

