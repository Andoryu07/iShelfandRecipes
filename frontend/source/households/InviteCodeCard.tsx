import { Button, Card, CardActions, CardContent, Snackbar, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Household } from "../api/types";
import { regenerateInviteCode } from "../api/householdsApi";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { texts } from "../translations/cs";
import { householdsQueryKey } from "./useCurrentHousehold";

export function InviteCodeCard({ household }: { household: Household }) {
  const queryClient = useQueryClient();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isCopiedMessageOpen, setIsCopiedMessageOpen] = useState(false);
  const regenerateMutation = useMutation({
    mutationFn: () => regenerateInviteCode(household.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdsQueryKey }),
  });

  async function shareInviteCode() {
    const message = texts.household.shareMessage(household.inviteCode);
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(household.inviteCode);
    setIsCopiedMessageOpen(true);
  }

  return (
    <Card variant="outlined" className="section">
      <CardContent>
        <Typography variant="h6" component="h2">
          {texts.household.inviteTitle}
        </Typography>
        <Typography color="text.secondary">{texts.household.inviteDescription}</Typography>
        <Typography className="inviteCode" sx={{ mt: 2 }}>
          {household.inviteCode}
        </Typography>
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={shareInviteCode}>
          {texts.household.shareInviteCode}
        </Button>
        {household.role === "owner" && (
          <Button onClick={() => setIsConfirmationOpen(true)} disabled={regenerateMutation.isPending}>
            {texts.household.regenerateInviteCode}
          </Button>
        )}
      </CardActions>
      <ConfirmationDialog
        message={isConfirmationOpen ? texts.household.regenerateConfirmation : null}
        confirmLabel={texts.household.regenerateInviteCode}
        onConfirm={() => {
          setIsConfirmationOpen(false);
          regenerateMutation.mutate();
        }}
        onClose={() => setIsConfirmationOpen(false)}
      />
      <Snackbar
        open={isCopiedMessageOpen}
        autoHideDuration={2000}
        onClose={() => setIsCopiedMessageOpen(false)}
        message={texts.household.copied}
      />
    </Card>
  );
}
