import { Alert, AlertTitle } from "@mui/material";
import { formatTimestamp, texts } from "../translations/cs";
import { useCurrentHousehold } from "./useCurrentHousehold";

export function LockedHouseholdBanner() {
  const { household } = useCurrentHousehold();
  if (!household || (!household.isLocked && !household.locksAt)) {
    return null;
  }
  const isOwner = household.role === "owner";
  if (!household.isLocked && household.locksAt) {
    const time = formatTimestamp(household.locksAt);
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>{texts.households.locksSoonTitle}</AlertTitle>
        {isOwner ? texts.households.locksSoonOwner(time) : texts.households.locksSoonMember(time)}
      </Alert>
    );
  }
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>{texts.households.lockedTitle}</AlertTitle>
      {isOwner
        ? texts.households.lockedOwner(household.memberCount > household.memberLimit, household.memberLimit)
        : texts.households.lockedMember}
    </Alert>
  );
}
