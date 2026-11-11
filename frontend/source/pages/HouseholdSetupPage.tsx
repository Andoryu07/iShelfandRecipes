import { Alert, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { createHousehold, joinHousehold } from "../api/householdsApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { householdsQueryKey } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

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
  const joinMutation = useMutation({ mutationFn: joinHousehold, onSuccess });
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
          <Button type="submit" variant="outlined" fullWidth sx={{ mt: 1 }} disabled={joinMutation.isPending}>
            {texts.householdSetup.join}
          </Button>
        </CardContent>
      </Card>

      <Button sx={{ mt: 3 }} onClick={logOut}>
        {texts.authentication.logOut}
      </Button>
    </main>
  );
}
