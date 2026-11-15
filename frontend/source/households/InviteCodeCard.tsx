import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import { Button, Card, CardActions, CardContent, Snackbar, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Household } from "../api/types";
import {
  createInviteLink,
  listInviteLinks,
  regenerateInviteCode,
  revokeInviteLink,
} from "../api/householdsApi";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { formatTimestamp, texts } from "../translations/cs";
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
    <Card sx={{ mt: 2, bgcolor: "action.hover", borderStyle: "dashed", borderWidth: 2 }}>
      <CardContent sx={{ textAlign: "center" }}>
        <Typography variant="h6" component="h2">
          {texts.household.inviteTitle}
        </Typography>
        <Typography color="text.secondary">{texts.household.inviteDescription}</Typography>
        <Typography className="inviteCode" sx={{ mt: 2, fontWeight: 700 }}>
          {household.inviteCode}
        </Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button variant="contained" onClick={shareInviteCode}>
          {texts.household.shareInviteCode}
        </Button>
        {household.role === "owner" && (
          <Button onClick={() => setIsConfirmationOpen(true)} disabled={regenerateMutation.isPending}>
            {texts.household.regenerateInviteCode}
          </Button>
        )}
      </CardActions>
      {household.role === "owner" && <InviteLinks householdId={household.id} />}
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

function InviteLinks({ householdId }: { householdId: number }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const linksKey = ["households", householdId, "inviteLinks"];
  const linksQuery = useQuery({ queryKey: linksKey, queryFn: () => listInviteLinks(householdId) });
  const createMutation = useMutation({
    mutationFn: () => createInviteLink(householdId),
    onSuccess: async (link) => {
      await queryClient.invalidateQueries({ queryKey: linksKey });
      const url = `${window.location.origin}/join#token=${link.token}`;
      if (navigator.share) {
        try {
          await navigator.share({ text: texts.household.inviteLinkMessage(url) });
          return;
        } catch {
          return;
        }
      }
      await navigator.clipboard.writeText(url);
      setMessage(texts.household.inviteLinkCopied);
    },
  });
  const revokeMutation = useMutation({
    mutationFn: revokeInviteLink,
    onSettled: () => queryClient.invalidateQueries({ queryKey: linksKey }),
  });
  const links = linksQuery.data ?? [];

  return (
    <CardContent sx={{ pt: 0, textAlign: "center" }}>
      <Button
        variant="outlined"
        startIcon={<LinkRoundedIcon />}
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
      >
        {texts.household.inviteLink}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {texts.household.inviteLinkHint}
      </Typography>
      {links.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1.5, alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {texts.household.activeLinks}
          </Typography>
          {links.map((link) => (
            <Stack key={link.id} direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {texts.household.linkValidUntil(formatTimestamp(link.expiresAt))}
              </Typography>
              <Button size="small" color="error" onClick={() => revokeMutation.mutate(link.id)}>
                {texts.household.revokeLink}
              </Button>
            </Stack>
          ))}
        </Stack>
      )}
      <Snackbar
        open={message !== null}
        autoHideDuration={2000}
        onClose={() => setMessage(null)}
        message={message}
      />
    </CardContent>
  );
}
