export const foodPhotoSize = 256;
const photoQuality = 0.8;

export function centeredSquare(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, photoQuality));
}

export async function compressFoodPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const square = centeredSquare(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = foodPhotoSize;
  canvas.height = foodPhotoSize;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, square.x, square.y, square.size, square.size, 0, 0, foodPhotoSize, foodPhotoSize);
  bitmap.close();
  const webp = await canvasToBlob(canvas, "image/webp");
  if (webp && webp.type === "image/webp") {
    return webp;
  }
  const jpeg = await canvasToBlob(canvas, "image/jpeg");
  if (!jpeg) {
    throw new Error("The photo could not be compressed");
  }
  return jpeg;
}
