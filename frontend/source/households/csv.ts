export type CsvValue = string | number | null | undefined;

function formatValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(header: string[], rows: CsvValue[][]): string {
  return "﻿" + [header, ...rows].map((row) => row.map(formatValue).join(";")).join("\r\n") + "\r\n";
}

export function downloadCsv(fileName: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
