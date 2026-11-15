import { Card, CardContent, Chip, MenuItem, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateNotificationSettings } from "../api/householdsApi";
import type { Household } from "../api/types";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";
import { householdsQueryKey } from "./useCurrentHousehold";

const hours = Array.from({ length: 17 }, (_, index) => index + 6);
const dayOptions = [0, 1, 2, 3, 5, 7];

export function NotificationSettingsCard({ household }: { household: Household }) {
  const queryClient = useQueryClient();
  const [isSavedMessageOpen, setIsSavedMessageOpen] = useState(false);
  const settingsMutation = useMutation({
    mutationFn: (settings: { notificationHour?: number; expirationWarningDays?: number }) =>
      updateNotificationSettings(household.id, settings),
    onSuccess: (updated) => {
      queryClient.setQueryData<Household[]>(householdsQueryKey, (current) =>
        current?.map((candidate) => (candidate.id === updated.id ? updated : candidate)),
      );
      setIsSavedMessageOpen(true);
    },
  });

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography sx={{ fontWeight: 600 }}>{texts.notifications.settingsTitle}</Typography>
        <Typography variant="body2" color="text.secondary">
          {texts.notifications.settingsDescription}
        </Typography>
        <TextField
          select
          label={texts.notifications.hour}
          value={household.notificationHour}
          onChange={(event) => settingsMutation.mutate({ notificationHour: Number(event.target.value) })}
          disabled={settingsMutation.isPending}
          sx={{ mt: 2, maxWidth: 200 }}
        >
          {hours.map((hour) => (
            <MenuItem key={hour} value={hour}>
              {`${hour}:00`}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
          {texts.notifications.daysAhead}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {dayOptions.map((days) => (
            <Chip
              key={days}
              label={texts.notifications.daysAheadOption(days)}
              color={household.expirationWarningDays === days ? "primary" : "default"}
              disabled={settingsMutation.isPending}
              onClick={() => settingsMutation.mutate({ expirationWarningDays: days })}
            />
          ))}
        </Stack>
        {settingsMutation.error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {describeError(settingsMutation.error)}
          </Typography>
        )}
      </CardContent>
      <Snackbar
        open={isSavedMessageOpen}
        autoHideDuration={2000}
        onClose={() => setIsSavedMessageOpen(false)}
        message={texts.notifications.settingsSaved}
      />
    </Card>
  );
}
