import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  cancelOwnJoinRequest,
  createHousehold,
  getOwnJoinRequest,
  listHouseholds,
  requestToJoinHousehold,
} from "../api/householdsApi";
import type { JoinRequest } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { householdsQueryKey } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

const ownJoinRequestQueryKey = ["joinRequests", "mine"];

function useHouseholdPolling(isWaiting: boolean) {
  useQuery({
    queryKey: householdsQueryKey,
    queryFn: listHouseholds,
    enabled: isWaiting,
    refetchInterval: isWaiting ? 10_000 : false,
  });
}

function JoinRequestCard({
  joinRequest,
  isCancelling,
  onCancel,
}: {
  joinRequest: JoinRequest;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  return (
    <Card
      className="section"
      variant="outlined"
      sx={{ borderColor: joinRequest.isRejected ? "error.main" : "primary.main", borderWidth: 2 }}
    >
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
          {!joinRequest.isRejected && <CircularProgress size={22} />}
          <Typography variant="h6" component="h2">
            {joinRequest.isRejected ? texts.householdSetup.rejectedTitle : texts.householdSetup.waitingTitle}
          </Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {joinRequest.isRejected
            ? texts.householdSetup.rejectedText(joinRequest.householdName)
            : texts.householdSetup.waitingText(joinRequest.householdName)}
        </Typography>
        <Button sx={{ mt: 1, px: 0 }} onClick={onCancel} disabled={isCancelling}>
          {joinRequest.isRejected ? texts.householdSetup.dismiss : texts.householdSetup.cancelRequest}
        </Button>
      </CardContent>
    </Card>
  );
}

export function HouseholdSetupPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { logOut } = useAuthentication();
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const onSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: householdsQueryKey });
    navigate("/household", { replace: true });
  };
  const createMutation = useMutation({ mutationFn: createHousehold, onSuccess });
  const joinRequestQuery = useQuery({
    queryKey: ownJoinRequestQueryKey,
    queryFn: getOwnJoinRequest,
    refetchInterval: (query) => (query.state.data && !query.state.data.isRejected ? 10_000 : false),
  });
  const joinMutation = useMutation({
    mutationFn: requestToJoinHousehold,
    onSuccess: (joinRequest) => queryClient.setQueryData(ownJoinRequestQueryKey, joinRequest),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelOwnJoinRequest,
    onSuccess: () => queryClient.setQueryData(ownJoinRequestQueryKey, null),
  });
  const joinRequest = joinRequestQuery.data;
  useHouseholdPolling(Boolean(joinRequest && !joinRequest.isRejected));
  const errorMessages = {
    404: texts.householdSetup.invalidInviteCode,
    409: texts.householdSetup.alreadyInHousehold,
  };

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(householdName);
  }

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    joinMutation.mutate(inviteCode);
  }

  return (
    <main className="centeredPage">
      <Typography variant="h5" component="h1" gutterBottom>
        {texts.householdSetup.title}
      </Typography>
      <Typography color="text.secondary">{texts.householdSetup.introduction}</Typography>

      {joinRequest && (
        <JoinRequestCard
          joinRequest={joinRequest}
          isCancelling={cancelMutation.isPending}
          onCancel={() => cancelMutation.mutate()}
        />
      )}

      {!(joinRequest && !joinRequest.isRejected) && (
        <>
          <Card className="section" variant="outlined">
            <CardContent component="form" onSubmit={handleCreate}>
              <Typography variant="h6" component="h2">
                {texts.householdSetup.createTitle}
              </Typography>
              <TextField
                label={texts.householdSetup.householdName}
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                required
              />
              {createMutation.error && (
                <Alert severity="error">{describeError(createMutation.error, errorMessages)}</Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 1 }}
                disabled={createMutation.isPending}
              >
                {texts.householdSetup.create}
              </Button>
            </CardContent>
          </Card>

          <Card className="section" variant="outlined">
            <CardContent component="form" onSubmit={handleJoin}>
              <Typography variant="h6" component="h2">
                {texts.householdSetup.joinTitle}
              </Typography>
              <TextField
                label={texts.householdSetup.inviteCode}
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                slotProps={{ htmlInput: { maxLength: 20, autoCapitalize: "characters", autoCorrect: "off" } }}
                required
              />
              {joinMutation.error && (
                <Alert severity="error">{describeError(joinMutation.error, errorMessages)}</Alert>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {texts.householdSetup.joinCodeHint}
              </Typography>
              <Button
                type="submit"
                variant="outlined"
                fullWidth
                sx={{ mt: 1 }}
                disabled={joinMutation.isPending}
              >
                {texts.householdSetup.sendRequest}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Button sx={{ mt: 3 }} onClick={logOut}>
        {texts.authentication.logOut}
      </Button>
    </main>
  );
}
