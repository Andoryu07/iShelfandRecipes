import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { listMembers, removeMember } from "../api/householdsApi";
import type { Household, User } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { InviteCodeCard } from "../households/InviteCodeCard";
import { JoinRequestsSection } from "../households/JoinRequestsSection";
import { MembersSection, membersQueryKey } from "../households/MembersSection";
import { ExportSection } from "../households/ExportSection";
import { StorageLocationsSection } from "../households/StorageLocationsSection";
import { refreshHouseholds, useCurrentHousehold } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

export function HouseholdPage() {
  const { household } = useCurrentHousehold();
  const { user } = useAuthentication();
  return household && user ? <HouseholdDetails household={household} user={user} /> : null;
}

function HouseholdDetails({ household, user }: { household: Household; user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isLeaveConfirmationOpen, setIsLeaveConfirmationOpen] = useState(false);
  const membersQuery = useQuery({
    queryKey: membersQueryKey(household.id),
    queryFn: () => listMembers(household.id),
  });
  const leaveMutation = useMutation({
    mutationFn: () => removeMember(household.id, user.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["households", household.id] });
      await refreshHouseholds(queryClient);
      navigate("/household/setup", { replace: true });
    },
  });
  const isLastMember = membersQuery.data?.length === 1;
  return (
    <>
      <Typography variant="h5" component="h2">
        {household.name}
      </Typography>
      <Box data-tour="householdInvite">
        {household.canShare ? (
          <InviteCodeCard household={household} />
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            {texts.guest.sharingNeedsAccount}
          </Alert>
        )}
      </Box>
      {household.role === "owner" && <JoinRequestsSection householdId={household.id} />}
      <Box data-tour="householdMembers">
        <MembersSection household={household} currentUserId={user.id} />
      </Box>
      <Box data-tour="householdLocations">
        <StorageLocationsSection household={household} />
      </Box>
      <Box data-tour="householdExport">
        <ExportSection household={household} />
      </Box>
      <Stack className="section" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Button
          color="error"
          onClick={() => setIsLeaveConfirmationOpen(true)}
          disabled={leaveMutation.isPending}
        >
          {texts.household.leaveHousehold}
        </Button>
      </Stack>
      <ConfirmationDialog
        message={
          isLeaveConfirmationOpen
            ? isLastMember
              ? texts.household.leaveLastMemberConfirmation
              : texts.household.leaveConfirmation
            : null
        }
        confirmLabel={texts.household.leaveHousehold}
        onConfirm={() => {
          setIsLeaveConfirmationOpen(false);
          leaveMutation.mutate();
        }}
        onClose={() => setIsLeaveConfirmationOpen(false)}
      />
    </>
  );
}
