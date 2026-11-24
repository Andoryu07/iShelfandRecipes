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

function checkDigitOf(digitsWithoutCheck: string): number {
  let sum = 0;
  for (let index = 0; index < digitsWithoutCheck.length; index += 1) {
    const digit = Number(digitsWithoutCheck[digitsWithoutCheck.length - 1 - index]);
    sum += index % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

function hasValidCheckDigit(code: string): boolean {
  return checkDigitOf(code.slice(0, -1)) === Number(code[code.length - 1]);
}

export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) {
    return null;
  }
  const [system, d1, d2, d3, d4, d5, d6, check] = code;
  const middle =
    d6 === "0" || d6 === "1" || d6 === "2"
      ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
      : d6 === "3"
        ? `${d1}${d2}${d3}00000${d4}${d5}`
        : d6 === "4"
          ? `${d1}${d2}${d3}${d4}00000${d5}`
          : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${system}${middle}${check}`;
}

export function isProductBarcode(value: string): boolean {
  const code = value.trim();
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) {
    return false;
  }
  if (hasValidCheckDigit(code)) {
    return true;
  }
  const upcA = code.length === 8 ? expandUpcE(code) : null;
  return upcA !== null && hasValidCheckDigit(upcA);
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
