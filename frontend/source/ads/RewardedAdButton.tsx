import SmartDisplayRoundedIcon from "@mui/icons-material/SmartDisplayRounded";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { recordRewardedAd } from "../api/plansApi";
import type { RewardKind } from "../api/types";
import { planQueryKey, usePlan } from "../plans/usePlan";
import { texts } from "../translations/cs";

const adSeconds = 5;

interface RewardedAdButtonProps {
  kind: RewardKind;
  onRewarded?: () => void;
}

function RewardedAdDialog({ kind, onClose, onRewarded }: RewardedAdButtonProps & { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState(adSeconds);
  const mutation = useMutation({
    mutationFn: () => recordRewardedAd(kind),
    onSuccess: async (plan) => {
      queryClient.setQueryData(planQueryKey, plan);
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes("recipeScanAllowance"),
      });
      onRewarded?.();
      onClose();
    },
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timeout = window.setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [secondsLeft]);

  return (
    <Dialog open onClose={onClose} fullWidth>
      <DialogTitle>{texts.ads.rewardedTitle}</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 4, textAlign: "center", bgcolor: "action.hover", borderRadius: 2 }}>
          <SmartDisplayRoundedIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
            {texts.ads.rewardedPlaying}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={((adSeconds - secondsLeft) / adSeconds) * 100}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
        />
        {mutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {texts.ads.rewardedFailed}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button
          variant="contained"
          disabled={secondsLeft > 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {secondsLeft > 0 ? texts.ads.rewardedSeconds(secondsLeft) : texts.ads.rewardedClaim}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function RewardedAdButton({ kind, onRewarded }: RewardedAdButtonProps) {
  const plan = usePlan().data;
  const [isOpen, setIsOpen] = useState(false);
  if (!plan || plan.rewardedAdsLeftToday <= 0) {
    return null;
  }
  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SmartDisplayRoundedIcon />}
        onClick={() => setIsOpen(true)}
        sx={{ mt: 1 }}
      >
        {texts.ads.rewardedButton} · {texts.ads.rewardedLeft(plan.rewardedAdsLeftToday)}
      </Button>
      {isOpen && <RewardedAdDialog kind={kind} onClose={() => setIsOpen(false)} onRewarded={onRewarded} />}
    </>
  );
}
