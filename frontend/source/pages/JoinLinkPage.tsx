import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError } from "../api/apiClient";
import { joinHouseholdByLink } from "../api/householdsApi";
import { describeHouseholdError } from "../households/householdErrors";
import { householdsQueryKey, selectHousehold, useCurrentHousehold } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

export function JoinLinkPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
  const { isPending } = useCurrentHousehold();
  const joinMutation = useMutation({
    mutationFn: () => joinHouseholdByLink(token),
    onSuccess: async (joinedHousehold) => {
      window.history.replaceState(null, "", window.location.pathname);
      selectHousehold(joinedHousehold.id);
      await queryClient.invalidateQueries({ queryKey: householdsQueryKey });
      navigate("/overview", { replace: true });
    },
  });
  const canJoin = Boolean(token) && !isPending;
  const { mutate, isIdle } = joinMutation;

  useEffect(() => {
    if (canJoin && isIdle) {
      mutate();
    }
  }, [canJoin, isIdle, mutate]);

  let message: string | null = null;
  if (!token) {
    message = texts.householdSetup.linkWithoutToken;
  } else if (joinMutation.error) {
    message =
      joinMutation.error instanceof ApiError && joinMutation.error.status === 410
        ? texts.householdSetup.linkInvalid
        : describeHouseholdError(joinMutation.error);
  }

  return (
    <main className="centeredPage">
      <Typography variant="h5" component="h1" gutterBottom>
        {texts.householdSetup.title}
      </Typography>
      {message ? (
        <>
          <Alert severity="warning">{message}</Alert>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/", { replace: true })}>
            {texts.householdSetup.continue}
          </Button>
        </>
      ) : (
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
          <CircularProgress size={24} />
          <Typography>{texts.householdSetup.joiningByLink}</Typography>
        </Stack>
      )}
    </main>
  );
}
