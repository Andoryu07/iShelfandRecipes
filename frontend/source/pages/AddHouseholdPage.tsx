import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { Alert, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { HouseholdSetupForms } from "../households/HouseholdSetupForms";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { usePlan } from "../plans/usePlan";
import { texts } from "../translations/cs";

export function AddHouseholdPage() {
  const navigate = useNavigate();
  const { user } = useAuthentication();
  const plan = usePlan().data;
  const { households } = useCurrentHousehold();
  if (!plan) {
    return null;
  }
  if (user?.isGuest) {
    return (
      <Alert
        severity="info"
        sx={{ mt: 2 }}
        action={<Button onClick={() => navigate("/profile/account")}>{texts.guest.createAccount}</Button>}
      >
        {texts.guest.householdsNeedAccount}
      </Alert>
    );
  }
  const isAtLimit = households.length >= plan.householdLimit;
  return (
    <>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {texts.households.addIntroduction(households.length, plan.householdLimit)}
      </Typography>
      {isAtLimit ? (
        <Card className="section">
          <CardContent>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: "center" }}>
              <LockRoundedIcon color="warning" />
              <Typography>
                {plan.plan === "premium"
                  ? texts.households.premiumLimitReached
                  : texts.households.morePremium}
              </Typography>
            </Stack>
            {plan.plan !== "premium" && (
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/profile/premium")}>
                {texts.premium.showPremium}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <HouseholdSetupForms onCreated={() => navigate("/household", { replace: true })} />
      )}
    </>
  );
}
