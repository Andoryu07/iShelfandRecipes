import { Button, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { listMembers, removeMember } from "../api/householdsApi";
import type { Household, User } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { AccountSection } from "../households/AccountSection";
import { InviteCodeCard } from "../households/InviteCodeCard";
import { MembersSection, membersQueryKey } from "../households/MembersSection";
import { NotificationsSection } from "../households/NotificationsSection";
import { StorageLocationsSection } from "../households/StorageLocationsSection";
import { householdsQueryKey, useCurrentHousehold } from "../households/useCurrentHousehold";
import { texts } from "../translations/cs";

export function HouseholdPage() {
  const { household } = useCurrentHousehold();
  const { user } = useAuthentication();
  return household && user ? <HouseholdDetails household={household} user={user} /> : null;
}

function HouseholdDetails({ household, user }: { household: Household; user: User }) {
  const { logOut } = useAuthentication();
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
      await queryClient.invalidateQueries({ queryKey: householdsQueryKey });
      navigate("/household/setup", { replace: true });
    },
  });
  const isLastMember = membersQuery.data?.length === 1;
  return (
    <>
      <Typography variant="h5" component="h1">
        {household.name}
      </Typography>
      <InviteCodeCard household={household} />
      <MembersSection household={household} currentUserId={user.id} />
      <StorageLocationsSection householdId={household.id} />
      <NotificationsSection />
      <AccountSection />
      <Stack className="section" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Button
          color="error"
          onClick={() => setIsLeaveConfirmationOpen(true)}
          disabled={leaveMutation.isPending}
        >
          {texts.household.leaveHousehold}
        </Button>
        <Button onClick={logOut}>{texts.authentication.logOut}</Button>
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
