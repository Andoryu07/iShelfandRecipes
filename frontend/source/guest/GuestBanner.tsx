import { Alert, AlertTitle, Button } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { texts } from "../translations/cs";

export function GuestBanner() {
  const { user } = useAuthentication();
  const navigate = useNavigate();
  if (!user?.isGuest) {
    return null;
  }
  return (
    <Alert
      severity="info"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" onClick={() => navigate("/profile/account")}>
          {texts.guest.createAccount}
        </Button>
      }
    >
      <AlertTitle>{texts.guest.bannerTitle}</AlertTitle>
      {texts.guest.bannerText}
    </Alert>
  );
}
