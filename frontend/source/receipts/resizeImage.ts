const maximumLongerSide = 1600;
const jpegQuality = 0.85;

export function scaledSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, maximumLongerSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function resizeImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const size = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", jpegQuality),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
