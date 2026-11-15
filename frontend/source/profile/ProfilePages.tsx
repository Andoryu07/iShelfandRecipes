import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { withdrawReceiptConsent } from "../api/authenticationApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { describeError } from "../errorMessages";
import { NotificationsSection } from "../households/NotificationsSection";
import { formatTimestamp, texts } from "../translations/cs";
import { NotificationSettingsCard } from "../households/NotificationSettingsCard";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { SettingsList } from "./SettingsList";

export function ProfilePage() {
  const { user, logOut } = useAuthentication();
  const navigate = useNavigate();
  if (!user) {
    return null;
  }
  return (
    <>
      <Stack sx={{ alignItems: "center", mt: 2 }}>
        <Avatar
          sx={{ width: 72, height: 72, fontSize: 32, bgcolor: "primary.main", color: "primary.contrastText" }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="h6" sx={{ mt: 1 }}>
          {user.displayName}
        </Typography>
        <Typography color="text.secondary">{user.email}</Typography>
      </Stack>
      <SettingsList
        items={[
          {
            icon: <PersonRoundedIcon />,
            label: texts.profile.account,
            description: texts.profile.accountDescription,
            onClick: () => navigate("/profile/account"),
          },
          {
            icon: <DarkModeRoundedIcon />,
            label: texts.profile.appearance,
            description: texts.profile.appearanceDescription,
            onClick: () => navigate("/profile/appearance"),
          },
          {
            icon: <NotificationsRoundedIcon />,
            label: texts.profile.notifications,
            description: texts.profile.notificationsDescription,
            onClick: () => navigate("/profile/notifications"),
          },
          {
            icon: <LockRoundedIcon />,
            label: texts.profile.privacy,
            description: texts.profile.privacyDescription,
            onClick: () => navigate("/profile/privacy"),
          },
          {
            icon: <InfoRoundedIcon />,
            label: texts.profile.about,
            description: texts.profile.aboutDescription,
            onClick: () => navigate("/profile/about"),
          },
        ]}
      />
      <Button variant="outlined" fullWidth size="large" sx={{ mt: 3 }} onClick={logOut}>
        {texts.authentication.logOut}
      </Button>
    </>
  );
}

export function AccountSettingsPage() {
  const { user } = useAuthentication();
  return (
    <>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {texts.authentication.displayName}
          </Typography>
          <Typography sx={{ mb: 2 }}>{user?.displayName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {texts.authentication.email}
          </Typography>
          <Typography>{user?.email}</Typography>
        </CardContent>
      </Card>
      <ChangePasswordCard />
      <Box className="section">
        <DeleteAccountButton />
      </Box>
    </>
  );
}

export function AppearancePage() {
  const { mode, setMode } = useColorScheme();
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography className="listSectionTitle" component="h2" sx={{ mt: "0 !important" }}>
          {texts.profile.theme}
        </Typography>
        <RadioGroup
          value={mode ?? "system"}
          onChange={(event) => setMode(event.target.value as "light" | "dark" | "system")}
        >
          <FormControlLabel value="light" control={<Radio />} label={texts.profile.themeLight} />
          <FormControlLabel value="dark" control={<Radio />} label={texts.profile.themeDark} />
          <FormControlLabel value="system" control={<Radio />} label={texts.profile.themeSystem} />
        </RadioGroup>
        <Typography variant="body2" color="text.secondary">
          {texts.profile.themeStoredOnDevice}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function NotificationsSettingsPage() {
  const { household } = useCurrentHousehold();
  return (
    <>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <NotificationsSection />
        </CardContent>
      </Card>
      {household && <NotificationSettingsCard household={household} />}
    </>
  );
}

export function PrivacySettingsPage() {
  const { user, replaceUser } = useAuthentication();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isWithdrawnMessageOpen, setIsWithdrawnMessageOpen] = useState(false);
  const withdrawMutation = useMutation({
    mutationFn: withdrawReceiptConsent,
    onSuccess: (updatedUser) => {
      replaceUser(updatedUser);
      setIsWithdrawnMessageOpen(true);
    },
  });

  return (
    <>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Link component={RouterLink} to="/privacy">
            {texts.account.privacyPolicy}
          </Link>
          <Typography className="listSectionTitle" component="h2">
            {texts.profile.receiptConsent}
          </Typography>
          <Typography color="text.secondary">
            {user?.receiptConsentGivenAt
              ? texts.profile.consentGivenAt(formatTimestamp(user.receiptConsentGivenAt))
              : texts.profile.consentNotGiven}
          </Typography>
          {user?.receiptConsentGivenAt && (
            <Button
              sx={{ mt: 1, px: 0 }}
              onClick={() => setIsConfirmationOpen(true)}
              disabled={withdrawMutation.isPending}
            >
              {texts.account.withdrawConsent}
            </Button>
          )}
          {withdrawMutation.error && <Alert severity="error">{describeError(withdrawMutation.error)}</Alert>}
        </CardContent>
      </Card>
      <ConfirmationDialog
        message={isConfirmationOpen ? texts.account.withdrawConsentConfirmation : null}
        confirmLabel={texts.account.withdrawConsent}
        onConfirm={() => {
          setIsConfirmationOpen(false);
          withdrawMutation.mutate();
        }}
        onClose={() => setIsConfirmationOpen(false)}
      />
      <Snackbar
        open={isWithdrawnMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsWithdrawnMessageOpen(false)}
        message={texts.account.consentWithdrawn}
      />
    </>
  );
}

export function AboutPage() {
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6">{texts.applicationName}</Typography>
        <Typography color="text.secondary">{texts.profile.version(__APPLICATION_VERSION__)}</Typography>
        <Typography sx={{ mt: 2 }}>{texts.profile.aboutText}</Typography>
        <Typography sx={{ mt: 2 }}>
          {texts.profile.contact}{" "}
          <Link href={`mailto:${texts.profile.contactEmail}`}>{texts.profile.contactEmail}</Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
