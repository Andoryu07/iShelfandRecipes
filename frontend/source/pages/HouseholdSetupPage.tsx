import { Button, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { HouseholdSetupForms } from "../households/HouseholdSetupForms";
import { texts } from "../translations/cs";

export function HouseholdSetupPage() {
  const navigate = useNavigate();
  const { logOut } = useAuthentication();
  return (
    <main className="centeredPage">
      <Typography variant="h5" component="h1" gutterBottom>
        {texts.householdSetup.title}
      </Typography>
      <Typography color="text.secondary">{texts.householdSetup.introduction}</Typography>
      <HouseholdSetupForms onCreated={() => navigate("/household", { replace: true })} />
      <Button sx={{ mt: 3 }} onClick={logOut}>
        {texts.authentication.logOut}
      </Button>
    </main>
  );
}
