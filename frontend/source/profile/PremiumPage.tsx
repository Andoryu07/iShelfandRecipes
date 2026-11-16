import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router";
import { activateTestPremium, cancelTestPremium } from "../api/plansApi";
import type { ScanAllowance } from "../api/types";
import { describeError } from "../errorMessages";
import { planQueryKey, usePlan } from "../plans/usePlan";
import { formatDate, texts } from "../translations/cs";

function UsageRow({ label, allowance }: { label: string; allowance: ScanAllowance }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {texts.premium.usage(allowance.used, allowance.limit, allowance.period)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, (allowance.used / allowance.limit) * 100)}
        color={allowance.used >= allowance.limit ? "warning" : "primary"}
        sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
      />
    </Box>
  );
}

export function PremiumPage() {
  const queryClient = useQueryClient();
  const planQuery = usePlan();
  const testMutation = useMutation({
    mutationFn: (activate: boolean) => (activate ? activateTestPremium() : cancelTestPremium()),
    onSuccess: (plan) => {
      queryClient.setQueryData(planQueryKey, plan);
      void queryClient.invalidateQueries({ queryKey: ["households"] });
    },
  });
  const plan = planQuery.data;
  if (planQuery.error) {
    return <Alert severity="error">{describeError(planQuery.error)}</Alert>;
  }
  if (!plan) {
    return <LinearProgress sx={{ mt: 2 }} />;
  }
  const isPremium = plan.plan === "premium";
  if (plan.plan === "guest") {
    return (
      <Alert
        severity="info"
        sx={{ mt: 2 }}
        action={
          <Button color="inherit" size="small" component={RouterLink} to="/profile/account">
            {texts.guest.createAccount}
          </Button>
        }
      >
        {texts.premium.guestNeedsAccount}
      </Alert>
    );
  }
  return (
    <>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
            <WorkspacePremiumRoundedIcon color={isPremium ? "warning" : "disabled"} sx={{ fontSize: 40 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{isPremium ? texts.premium.premium : texts.premium.free}</Typography>
              <Typography variant="body2" color="text.secondary">
                {isPremium && plan.premiumUntil
                  ? texts.premium.activeUntil(formatDate(plan.premiumUntil.slice(0, 10)))
                  : texts.premium.freeDescription}
              </Typography>
            </Box>
            {isPremium && <Chip label={texts.premium.active} color="warning" size="small" />}
          </Stack>
          <UsageRow label={texts.premium.receiptScans} allowance={plan.receiptScans} />
          <UsageRow label={texts.premium.recipeScans} allowance={plan.recipeScans} />
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ px: 1 }}>
          <Typography variant="h6" sx={{ px: 1 }}>
            {texts.premium.comparisonTitle}
          </Typography>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell align="center">{texts.premium.free}</TableCell>
                <TableCell align="center" sx={{ color: "warning.main", fontWeight: 700 }}>
                  {texts.premium.premium}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {texts.premium.comparison.map(([feature, free, premium]) => (
                <TableRow key={feature}>
                  <TableCell sx={{ pl: 1 }}>{feature}</TableCell>
                  <TableCell align="center">{free}</TableCell>
                  <TableCell align="center">{premium}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography sx={{ px: 1, mt: 2, fontWeight: 700 }}>{texts.premium.price}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
            {texts.premium.paymentsLater}
          </Typography>
        </CardContent>
      </Card>
      {plan.testActivationAvailable && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {texts.premium.testDescription}
            </Typography>
            {testMutation.error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {describeError(testMutation.error)}
              </Alert>
            )}
            <Button
              variant={isPremium ? "outlined" : "contained"}
              fullWidth
              sx={{ mt: 1.5 }}
              disabled={testMutation.isPending}
              onClick={() => testMutation.mutate(!isPremium)}
            >
              {isPremium ? texts.premium.cancelTest : texts.premium.activateTest}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
