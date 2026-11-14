import AddRoundedIcon from "@mui/icons-material/AddRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listRecipes } from "../api/recipesApi";
import { getSpending } from "../api/statisticsApi";
import { listActiveReservations, listStockItems } from "../api/stockApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { greetingFor, vocative } from "../overview/vocative";
import { formatMoney } from "../receipts/money";
import { changePercent, monthLocative, monthText } from "../spending/months";
import { spendingQueryKey } from "../spending/SpendingView";
import { ExpirationChip } from "../stock/ExpirationChip";
import { formatQuantity } from "../stock/quantities";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { texts } from "../translations/cs";

export function OverviewPage() {
  const { household } = useCurrentHousehold();
  return household ? <Overview householdId={household.id} /> : null;
}

function SectionHeader({ title, onShowAll }: { title: string; onShowAll?: () => void }) {
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mt: 3, mb: 1 }}>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
      {onShowAll && (
        <Button size="small" onClick={onShowAll}>
          {texts.overview.showAll}
        </Button>
      )}
    </Stack>
  );
}

function Overview({ householdId }: { householdId: number }) {
  const navigate = useNavigate();
  const { user } = useAuthentication();
  const expiringQuery = useQuery({
    queryKey: [...stockItemsQueryKey(householdId), { expiringWithinDays: 3 }],
    queryFn: () => listStockItems(householdId, { expiringWithinDays: 3 }),
  });
  const reservationsQuery = useQuery({
    queryKey: [...stockItemsQueryKey(householdId), "activeReservations"],
    queryFn: () => listActiveReservations(householdId),
  });
  const recipesQuery = useQuery({
    queryKey: ["households", householdId, "recipes", ""],
    queryFn: () => listRecipes(householdId, ""),
  });
  const expiring = expiringQuery.data ?? [];
  const myReservations = (reservationsQuery.data ?? []).filter(
    (reservation) => reservation.userId === user?.id,
  );
  const cookable = (recipesQuery.data ?? []).filter((recipe) => recipe.missingCount === 0);

  return (
    <>
      <Typography variant="h5" component="h2" sx={{ mt: 1 }}>
        {texts.overview.greeting(
          greetingFor(new Date().getHours()),
          vocative(user?.displayName.trim().split(/\s+/)[0] ?? ""),
        )}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          sx={{ flex: 1, py: 1.5, flexDirection: "column", gap: 0.5, lineHeight: 1.2 }}
          onClick={() => navigate("/receipts")}
        >
          <PhotoCameraRoundedIcon />
          {texts.overview.scanReceipt}
        </Button>
        <Button
          variant="outlined"
          size="large"
          sx={{ flex: 1, py: 1.5, flexDirection: "column", gap: 0.5, lineHeight: 1.2 }}
          onClick={() => navigate("/stock?add=1")}
        >
          <AddRoundedIcon />
          {texts.overview.addFood}
        </Button>
      </Stack>

      <SectionHeader title={texts.overview.expiringTitle} onShowAll={() => navigate("/stock")} />
      <Card>
        {expiring.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary">{texts.overview.expiringNothing}</Typography>
          </CardContent>
        ) : (
          <List disablePadding>
            {expiring.slice(0, 5).map((stockItem, index) => (
              <ListItemButton
                key={stockItem.id}
                divider={index < Math.min(expiring.length, 5) - 1}
                onClick={() => navigate(`/stock?item=${stockItem.id}`)}
              >
                <ListItemAvatar>
                  <CategoryAvatar
                    category={stockItem.food.category}
                    genericName={stockItem.food.genericName}
                    icon={stockItem.food.icon}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={stockItem.food.name}
                  secondary={formatQuantity(stockItem.quantity, stockItem.food.baseUnit)}
                />
                <ExpirationChip expirationDate={stockItem.expirationDate} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Card>

      {myReservations.length > 0 && (
        <>
          <SectionHeader title={texts.overview.reservationsTitle} />
          <Card>
            <List disablePadding>
              {myReservations.map((reservation, index) => (
                <ListItem key={reservation.id} divider={index < myReservations.length - 1}>
                  <ListItemText primary={reservation.foodName} secondary={reservation.note} />
                </ListItem>
              ))}
            </List>
          </Card>
        </>
      )}

      <SpendingCard householdId={householdId} />

      <SectionHeader title={texts.overview.cookNowTitle} onShowAll={() => navigate("/recipes")} />
      {cookable.length === 0 ? (
        <Typography color="text.secondary">{texts.overview.cookNowNothing}</Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1.5 }}>
          {cookable.map((recipe) => (
            <Card key={recipe.id}>
              <CardActionArea onClick={() => navigate(`/recipes/${recipe.id}`)} sx={{ height: "100%" }}>
                <CardContent>
                  <Typography sx={{ fontWeight: 650 }}>{recipe.name}</Typography>
                  {recipe.preparationMinutes && (
                    <Typography variant="body2" color="text.secondary">
                      {texts.recipes.minutes(recipe.preparationMinutes)}
                    </Typography>
                  )}
                  <Chip size="small" color="success" label={texts.recipes.haveEverything} sx={{ mt: 1 }} />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </>
  );
}

function SpendingCard({ householdId }: { householdId: number }) {
  const navigate = useNavigate();
  const month = monthText(new Date());
  const spendingQuery = useQuery({
    queryKey: spendingQueryKey(householdId, month, 6),
    queryFn: () => getSpending(householdId, month, 6),
  });
  const spending = spendingQuery.data;
  const change = spending ? changePercent(spending.monthTotal, spending.previousMonthTotal) : null;
  return (
    <>
      <SectionHeader
        title={texts.spending.overviewTitle(monthLocative(month))}
        onShowAll={() => navigate("/receipts?view=spending")}
      />
      <Card>
        <CardActionArea onClick={() => navigate("/receipts?view=spending")}>
          <CardContent>
            {spending && spending.receiptCount > 0 ? (
              <>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {formatMoney(spending.monthTotal)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {[
                    texts.spending.receiptCount(spending.receiptCount),
                    change !== null ? texts.spending.changeAgainstPrevious(change) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">{texts.spending.overviewEmpty}</Typography>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </>
  );
}
