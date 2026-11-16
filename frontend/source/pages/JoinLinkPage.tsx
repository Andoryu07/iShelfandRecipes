import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError } from "../api/apiClient";
import { joinHouseholdByLink } from "../api/householdsApi";
import { describeError } from "../errorMessages";
import { householdsQueryKey, useCurrentHousehold } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

const householdFullDetail = "The household is full";

export function JoinLinkPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
  const { household, isPending } = useCurrentHousehold();
  const joinMutation = useMutation({
    mutationFn: () => joinHouseholdByLink(token),
    onSuccess: async () => {
      window.history.replaceState(null, "", window.location.pathname);
      await queryClient.invalidateQueries({ queryKey: householdsQueryKey });
      navigate("/overview", { replace: true });
    },
  });
  const canJoin = Boolean(token) && !isPending && !household;
  const { mutate, isIdle } = joinMutation;

  useEffect(() => {
    if (canJoin && isIdle) {
      mutate();
    }
  }, [canJoin, isIdle, mutate]);

  let message: string | null = null;
  if (!token) {
    message = texts.householdSetup.linkWithoutToken;
  } else if (!isPending && household && !joinMutation.isSuccess) {
    message = texts.householdSetup.alreadyMember;
  } else if (joinMutation.error) {
    message =
      joinMutation.error instanceof ApiError && joinMutation.error.status === 410
        ? texts.householdSetup.linkInvalid
        : joinMutation.error instanceof ApiError && joinMutation.error.detail === householdFullDetail
          ? texts.premium.householdFullForApplicant
          : describeError(joinMutation.error, { 409: texts.householdSetup.alreadyMember });
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
