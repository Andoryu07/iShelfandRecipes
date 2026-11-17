import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { exportReceiptItems, listStorageLocations } from "../api/householdsApi";
import { listStockItems } from "../api/stockApi";
import type { FoodCategory, Household, MeasurementUnit } from "../api/types";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import { buildCsv, downloadBlob, type CsvValue } from "./csv";

const unitSymbols: Record<MeasurementUnit, string> = { gram: "g", milliliter: "ml", piece: "ks" };

function categoryName(category: string | null): string {
  return category && category in texts.foodCategories ? texts.foodCategories[category as FoodCategory] : "";
}

type ExportKind = "stock" | "receipts";
type ExportFormat = "xlsx" | "csv";

async function stockRows(household: Household): Promise<CsvValue[][]> {
  const [stockItems, storageLocations] = await Promise.all([
    listStockItems(household.id, {}),
    listStorageLocations(household.id),
  ]);
  const locationNames = new Map(
    storageLocations.map((location) => [location.id, displayStorageLocationName(location)]),
  );
  return stockItems.map((item) => [
    item.food.name,
    item.food.genericName,
    categoryName(item.food.category),
    item.quantity,
    unitSymbols[item.food.baseUnit],
    item.reservedQuantity,
    locationNames.get(item.storageLocationId),
    item.expirationDate,
  ]);
}

async function receiptRows(household: Household): Promise<CsvValue[][]> {
  const items = await exportReceiptItems(household.id);
  return items.map((item) => [
    item.purchasedOn,
    item.storeName,
    item.originalText,
    item.name,
    categoryName(item.category),
    item.quantity,
    item.unit ? unitSymbols[item.unit] : null,
    item.price,
    item.discount,
  ]);
}

async function exportData(household: Household, kind: ExportKind, format: ExportFormat) {
  const rows = kind === "stock" ? await stockRows(household) : await receiptRows(household);
  const header = kind === "stock" ? texts.households.stockColumns : texts.households.receiptColumns;
  const fileName = `${kind === "stock" ? texts.households.stockFileName : texts.households.receiptsFileName}.${format}`;
  if (format === "csv") {
    downloadBlob(fileName, new Blob([buildCsv(header, rows)], { type: "text/csv;charset=utf-8" }));
    return;
  }
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const sheetData = [
    header.map((title) => ({ value: title, fontWeight: "bold" as const })),
    ...rows.map((row) => row.map((value) => value ?? null)),
  ];
  downloadBlob(fileName, await writeExcelFile(sheetData).toBlob());
}

export function ExportSection({ household }: { household: Household }) {
  const mutation = useMutation({
    mutationFn: ({ kind, format }: { kind: ExportKind; format: ExportFormat }) =>
      exportData(household, kind, format),
  });
  return (
    <section>
      <Typography className="listSectionTitle" component="h2">
        {texts.households.exportTitle}
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {texts.households.exportDescription}
          </Typography>
          {mutation.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {describeError(mutation.error)}
            </Alert>
          )}
          {(["stock", "receipts"] as const).map((kind) => (
            <Stack
              key={kind}
              direction="row"
              sx={{ gap: 1, mt: 1.5, alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography sx={{ minWidth: 72 }}>
                {kind === "stock" ? texts.households.exportStock : texts.households.exportReceipts}
              </Typography>
              {(["xlsx", "csv"] as const).map((format) => (
                <Button
                  key={format}
                  variant={format === "xlsx" ? "contained" : "outlined"}
                  size="small"
                  startIcon={<DownloadRoundedIcon />}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ kind, format })}
                >
                  {format === "xlsx" ? texts.households.exportExcel : texts.households.exportCsv}
                </Button>
              ))}
            </Stack>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
