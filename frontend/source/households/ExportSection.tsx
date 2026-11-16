import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { exportReceiptItems, listStorageLocations } from "../api/householdsApi";
import { listStockItems } from "../api/stockApi";
import type { FoodCategory, Household, MeasurementUnit } from "../api/types";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import { buildCsv, downloadCsv } from "./csv";

const unitSymbols: Record<MeasurementUnit, string> = { gram: "g", milliliter: "ml", piece: "ks" };

function categoryName(category: string | null): string {
  return category && category in texts.foodCategories ? texts.foodCategories[category as FoodCategory] : "";
}

async function exportStock(household: Household) {
  const [stockItems, storageLocations] = await Promise.all([
    listStockItems(household.id, {}),
    listStorageLocations(household.id),
  ]);
  const locationNames = new Map(
    storageLocations.map((location) => [location.id, displayStorageLocationName(location)]),
  );
  const rows = stockItems.map((item) => [
    item.food.name,
    item.food.genericName,
    categoryName(item.food.category),
    item.quantity,
    unitSymbols[item.food.baseUnit],
    item.reservedQuantity,
    locationNames.get(item.storageLocationId),
    item.expirationDate,
  ]);
  downloadCsv(`${texts.households.stockFileName}.csv`, buildCsv(texts.households.stockColumns, rows));
}

async function exportReceipts(household: Household) {
  const items = await exportReceiptItems(household.id);
  const rows = items.map((item) => [
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
  downloadCsv(`${texts.households.receiptsFileName}.csv`, buildCsv(texts.households.receiptColumns, rows));
}

export function ExportSection({ household }: { household: Household }) {
  const mutation = useMutation({
    mutationFn: (kind: "stock" | "receipts") =>
      kind === "stock" ? exportStock(household) : exportReceipts(household),
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
          <Stack direction="row" sx={{ gap: 1, mt: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("stock")}
            >
              {texts.households.exportStock}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("receipts")}
            >
              {texts.households.exportReceipts}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </section>
  );
}
