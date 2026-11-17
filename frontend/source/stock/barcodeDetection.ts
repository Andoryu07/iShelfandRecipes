const barcodeFormats = ["ean_13", "ean_8", "upc_a", "upc_e"];

export interface DetectedBarcode {
  rawValue: string;
}

export interface BarcodeReader {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface NativeBarcodeDetector {
  new (options: { formats: string[] }): BarcodeReader;
  getSupportedFormats(): Promise<string[]>;
}

export function isProductBarcode(value: string): boolean {
  return /^\d{6,14}$/.test(value.trim());
}

export async function createBarcodeReader(): Promise<BarcodeReader> {
  const native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetector }).BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      if (barcodeFormats.some((format) => supported.includes(format))) {
        return new native({ formats: barcodeFormats.filter((format) => supported.includes(format)) });
      }
    } catch {
      // Fall back to the WebAssembly reader below.
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import("barcode-detector/ponyfill"),
    import("zxing-wasm/reader/zxing_reader.wasm?url"),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
    },
  });
  return new BarcodeDetector({ formats: barcodeFormats as never[] });
}
