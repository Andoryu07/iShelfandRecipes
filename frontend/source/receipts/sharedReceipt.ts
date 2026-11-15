export const shareTargetPath = "/share-receipt";

const cacheName = "shared-receipts";
const cacheKey = "/shared-receipt";
const fileNameHeader = "X-File-Name";
const supportedType = /^(image\/|application\/pdf$)/;

export async function storeSharedReceipt(file: File): Promise<void> {
  const cache = await caches.open(cacheName);
  await cache.put(
    cacheKey,
    new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        [fileNameHeader]: encodeURIComponent(file.name),
      },
    }),
  );
}

export async function loadSharedReceipt(): Promise<File | null> {
  if (typeof caches === "undefined") {
    return null;
  }
  const response = await (await caches.open(cacheName)).match(cacheKey);
  if (!response) {
    return null;
  }
  const blob = await response.blob();
  const fileName = decodeURIComponent(response.headers.get(fileNameHeader) ?? "receipt");
  const type = blob.type || (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  return new File([blob], fileName, { type });
}

export function isSupportedReceiptFile(file: File): boolean {
  return supportedType.test(file.type);
}

export async function clearSharedReceipt(): Promise<void> {
  if (typeof caches !== "undefined") {
    await caches.delete(cacheName);
  }
}
