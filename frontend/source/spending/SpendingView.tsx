import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSpending } from "../api/statisticsApi";
import { usePlan } from "../plans/usePlan";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { describeError } from "../errorMessages";
import { formatMoney } from "../receipts/money";
import { texts } from "../translations/cs";
import { changePercent, formatMonthLong, formatMonthShort, monthText, shiftMonthText } from "./months";

export function spendingQueryKey(householdId: number, month: string, monthCount: number) {
  return ["households", householdId, "receipts", "spending", month, monthCount];
}

function MonthBars({
  months,
  selectedMonth,
  onSelect,
}: {
  months: { month: string; total: number; receiptCount: number }[];
  selectedMonth: string;
  onSelect: (month: string) => void;
}) {
  const maximum = Math.max(...months.map((month) => month.total), 1);
  return (
    <Box
      role="list"
      aria-label={texts.spending.monthsChart}
      sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 160, mt: 1 }}
    >
      {months.map((month) => {
        const isSelected = month.month === selectedMonth;
        return (
          <Tooltip
            key={month.month}
            title={texts.spending.monthTooltip(
              formatMonthLong(month.month),
              formatMoney(month.total),
              month.receiptCount,
            )}
          >
            <Box
              role="listitem"
              aria-label={`${formatMonthLong(month.month)}: ${formatMoney(month.total)}`}
              onClick={() => onSelect(month.month)}
              sx={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                cursor: "pointer",
                minWidth: 0,
              }}
            >
              {isSelected && (
                <Typography
                  variant="caption"
                  sx={{ textAlign: "center", fontWeight: 650, whiteSpace: "nowrap" }}
                >
                  {Math.round(month.total).toLocaleString("cs-CZ")}
                </Typography>
              )}
              <Box
                sx={{
                  height: `${Math.max((month.total / maximum) * 120, month.total > 0 ? 4 : 2)}px`,
                  borderRadius: "4px 4px 0 0",
                  bgcolor: "primary.main",
                  opacity: isSelected ? 1 : 0.35,
                  mx: "15%",
                }}
              />
              <Typography
                variant="caption"
                color={isSelected ? "text.primary" : "text.secondary"}
                sx={{ textAlign: "center", mt: 0.5, fontWeight: isSelected ? 650 : 400 }}
                noWrap
              >
                {formatMonthShort(month.month)}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

function ShareBars({
  rows,
  total,
}: {
  rows: { key: string; label: string; icon?: React.ReactNode; value: number; detail?: string }[];
  total: number;
}) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Stack sx={{ gap: 1.5, mt: 1 }}>
      {rows.map((row) => (
        <Box key={row.key}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            {row.icon}
            <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
              {row.label}
            </Typography>
            <Typography sx={{ fontWeight: 650, whiteSpace: "nowrap" }}>{formatMoney(row.value)}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ width: 48, textAlign: "right", whiteSpace: "nowrap" }}
            >
              {total > 0 ? `${Math.round((row.value / total) * 100)} %` : ""}
            </Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: "4px", bgcolor: "action.hover", mt: 0.5 }}>
            <Box
              sx={{
                height: "100%",
                width: `${(row.value / maximum) * 100}%`,
                borderRadius: "4px",
                bgcolor: "primary.main",
              }}
            />
          </Box>
          {row.detail && (
            <Typography variant="caption" color="text.secondary">
              {row.detail}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

export function SpendingView({ householdId }: { householdId: number }) {
  const currentMonth = monthText(new Date());
  const [month, setMonth] = useState(currentMonth);
  const [monthCount, setMonthCount] = useState(6);
  const spendingMonths = usePlan().data?.spendingMonths ?? null;
  const oldestMonth = spendingMonths === null ? null : shiftMonthText(currentMonth, 1 - spendingMonths);
  const spendingQuery = useQuery({
    queryKey: spendingQueryKey(householdId, month, monthCount),
    queryFn: () => getSpending(householdId, month, monthCount),
    placeholderData: (previousData) => previousData,
  });
  const spending = spendingQuery.data;
  const change = spending ? changePercent(spending.monthTotal, spending.previousMonthTotal) : null;
  const categoriesTotal = spending?.categories.reduce((sum, category) => sum + category.total, 0) ?? 0;

  return (
    <>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mt: 1 }}>
        <IconButton
          aria-label={texts.spending.previousMonth}
          onClick={() => setMonth(shiftMonthText(month, -1))}
          disabled={oldestMonth !== null && month <= oldestMonth}
        >
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography variant="h6" component="h2">
          {formatMonthLong(month)}
        </Typography>
        <IconButton
          aria-label={texts.spending.nextMonth}
          onClick={() => setMonth(shiftMonthText(month, 1))}
          disabled={month >= currentMonth}
        >
          <ChevronRightRoundedIcon />
        </IconButton>
      </Stack>
      {spendingQuery.error && <Alert severity="error">{describeError(spendingQuery.error)}</Alert>}
      {spending && (
        <>
          <Card sx={{ mt: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {texts.spending.spentThisMonth}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatMoney(spending.monthTotal)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[
                  texts.spending.receiptCount(spending.receiptCount),
                  change !== null ? texts.spending.changeAgainstPrevious(change) : null,
                  spending.discountsTotal > 0
                    ? texts.spending.discounts(formatMoney(spending.discountsTotal))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6" component="h3">
                  {texts.spending.trend}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={monthCount}
                  onChange={(_, value: number | null) => value && setMonthCount(value)}
                >
                  <ToggleButton value={6}>{texts.spending.sixMonths}</ToggleButton>
                  <ToggleButton value={12} disabled={spendingMonths !== null}>
                    {texts.spending.year}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <MonthBars months={spending.months} selectedMonth={month} onSelect={setMonth} />
              {spendingMonths !== null && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {texts.premium.olderSpendingInPremium}
                </Typography>
              )}
            </CardContent>
          </Card>

          {spending.receiptCount === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
              {texts.spending.noReceipts}
            </Typography>
          ) : (
            <>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {texts.spending.byStore}
                  </Typography>
                  <ShareBars
                    total={spending.monthTotal}
                    rows={spending.stores.map((store) => ({
                      key: store.storeName ?? "unknown",
                      label: store.storeName ?? texts.spending.unknownStore,
                      value: store.total,
                      detail: texts.spending.receiptCount(store.receiptCount),
                    }))}
                  />
                </CardContent>
              </Card>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {texts.spending.byCategory}
                  </Typography>
                  <ShareBars
                    total={categoriesTotal}
                    rows={spending.categories.map((category) => ({
                      key: category.category,
                      label: texts.foodCategories[category.category],
                      icon: <CategoryAvatar category={category.category} size={28} />,
                      value: category.total,
                    }))}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
