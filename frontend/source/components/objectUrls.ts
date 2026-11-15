const objectUrls = new WeakMap<Blob, string>();

export function objectUrlFor(blob: Blob): string {
  let url = objectUrls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    objectUrls.set(blob, url);
  }
  return url;
}

export function releaseObjectUrl(blob: Blob): void {
  const url = objectUrls.get(blob);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(blob);
  }
}
