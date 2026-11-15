import {
  Alert,
  Avatar,
  Button,
  Card,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { decideJoinRequest, listJoinRequests } from "../api/householdsApi";
import { describeError } from "../errorMessages";
import { formatTimestamp, texts } from "../translations/cs";
import { membersQueryKey } from "./MembersSection";

export function joinRequestsQueryKey(householdId: number) {
  return ["households", householdId, "joinRequests"];
}

export function JoinRequestsSection({ householdId }: { householdId: number }) {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({
    queryKey: joinRequestsQueryKey(householdId),
    queryFn: () => listJoinRequests(householdId),
    refetchInterval: 30_000,
  });
  const decisionMutation = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: number; decision: "approve" | "reject" }) =>
      decideJoinRequest(requestId, decision),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: joinRequestsQueryKey(householdId) }),
        queryClient.invalidateQueries({ queryKey: membersQueryKey(householdId) }),
      ]),
  });
  const requests = requestsQuery.data ?? [];
  if (requests.length === 0) {
    return null;
  }
  return (
    <section>
      <Typography className="listSectionTitle" component="h2">
        {texts.household.joinRequestsTitle}
      </Typography>
      {decisionMutation.error && <Alert severity="error">{describeError(decisionMutation.error)}</Alert>}
      <Card sx={{ borderColor: "warning.main", borderWidth: 2, borderStyle: "solid" }}>
        <List disablePadding>
          {requests.map((request, index) => (
            <ListItem key={request.id} divider={index < requests.length - 1} sx={{ flexWrap: "wrap" }}>
              <ListItemAvatar>
                <Avatar>{request.displayName.charAt(0).toUpperCase()}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={request.displayName}
                secondary={`${request.maskedEmail} · ${texts.household.requestedAt(formatTimestamp(request.createdAt))}`}
              />
              <Stack direction="row" spacing={1} sx={{ width: "100%", justifyContent: "flex-end" }}>
                <Button
                  color="error"
                  disabled={decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({ requestId: request.id, decision: "reject" })}
                >
                  {texts.household.reject}
                </Button>
                <Button
                  variant="contained"
                  disabled={decisionMutation.isPending}
                  onClick={() => decisionMutation.mutate({ requestId: request.id, decision: "approve" })}
                >
                  {texts.household.approve}
                </Button>
              </Stack>
            </ListItem>
          ))}
        </List>
      </Card>
    </section>
  );
}
