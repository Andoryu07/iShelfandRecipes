import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import { Alert, IconButton, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMembers, removeMember } from "../api/householdsApi";
import type { Household, HouseholdMember } from "../api/types";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

interface MembersSectionProps {
  household: Household;
  currentUserId: number;
}

export function membersQueryKey(householdId: number) {
  return ["households", householdId, "members"];
}

export function MembersSection({ household, currentUserId }: MembersSectionProps) {
  const queryClient = useQueryClient();
  const [memberToRemove, setMemberToRemove] = useState<HouseholdMember | null>(null);
  const membersQuery = useQuery({
    queryKey: membersQueryKey(household.id),
    queryFn: () => listMembers(household.id),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeMember(household.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersQueryKey(household.id) }),
  });

  return (
    <section className="section">
      <Typography variant="h6" component="h2">
        {texts.household.membersTitle}
      </Typography>
      {membersQuery.error && <Alert severity="error">{describeError(membersQuery.error)}</Alert>}
      {removeMutation.error && <Alert severity="error">{describeError(removeMutation.error)}</Alert>}
      <List>
        {membersQuery.data?.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const canRemove = household.role === "owner" && !isCurrentUser;
          return (
            <ListItem
              key={member.userId}
              disableGutters
              secondaryAction={
                canRemove && (
                  <IconButton
                    edge="end"
                    aria-label={texts.household.removeMember}
                    onClick={() => setMemberToRemove(member)}
                  >
                    <PersonRemoveRoundedIcon />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={
                  isCurrentUser ? `${member.displayName} (${texts.household.you})` : member.displayName
                }
                secondary={texts.householdRoles[member.role]}
              />
            </ListItem>
          );
        })}
      </List>
      <ConfirmationDialog
        message={memberToRemove ? texts.household.removeMemberConfirmation(memberToRemove.displayName) : null}
        confirmLabel={texts.household.removeMember}
        onConfirm={() => {
          if (memberToRemove) {
            removeMutation.mutate(memberToRemove.userId);
          }
          setMemberToRemove(null);
        }}
        onClose={() => setMemberToRemove(null)}
      />
    </section>
  );
}
