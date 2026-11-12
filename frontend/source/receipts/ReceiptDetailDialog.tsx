import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getReceipt } from "../api/receiptsApi";
import { describeError } from "../errorMessages";
import { formatQuantity } from "../stock/quantities";
import { formatDate, texts } from "../translations/cs";
import { formatMoney } from "./money";

export function ReceiptDetailDialog({ receiptId, onClose }: { receiptId: number; onClose: () => void }) {
  const receiptQuery = useQuery({ queryKey: ["receipts", receiptId], queryFn: () => getReceipt(receiptId) });
  const receipt = receiptQuery.data;

  return (
    <Dialog open onClose={onClose} fullWidth>
      <DialogTitle>
        {receipt
          ? `${receipt.storeName ?? ""} ${formatDate(receipt.purchasedOn)}`.trim()
          : texts.common.loading}
      </DialogTitle>
      <DialogContent>
        {receiptQuery.error && <Alert severity="error">{describeError(receiptQuery.error)}</Alert>}
        {receipt && (
          <>
            <Typography variant="h6">{formatMoney(receipt.totalAmount)}</Typography>
            {!receipt.itemsSumMatchesTotal && (
              <Typography color="warning.dark" variant="body2">
                {texts.receipts.sumMismatchShort}
              </Typography>
            )}
            <List dense>
              {receipt.items.map((item) => (
                <ListItem key={item.id} disableGutters secondaryAction={formatMoney(item.price)}>
                  <ListItemText
                    primary={item.name}
                    secondary={[
                      item.quantity !== null && item.unit ? formatQuantity(item.quantity, item.unit) : null,
                      item.stockItemId !== null ? texts.receipts.addedToStock : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
      </DialogActions>
    </Dialog>
  );
}
