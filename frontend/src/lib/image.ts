/**
 * Client-side image compression and resizing utility.
 * Downscales photos to maxDimension (default 1600px) and converts to optimized JPEG.
 */
export async function compressImage(
  file: File | Blob,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<Blob | File> {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;

  // Don't attempt to compress non-image files or SVG
  if (!file.type || !file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // If dimensions are within bounds and file size is already small (< 300KB), return original
      if (width <= maxDimension && height <= maxDimension && file.size <= 300 * 1024) {
        resolve(file);
        return;
      }

      // Calculate new dimensions preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            // If blob couldn't be generated or isn't smaller, use original file
            resolve(file);
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
