import { Alert, AlertTitle } from "@mui/material";
import { texts } from "../translations/cs";
import { useCurrentHousehold } from "./useCurrentHousehold";

export function LockedHouseholdBanner() {
  const { household } = useCurrentHousehold();
  if (!household) {
    return null;
  }
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>{texts.households.lockedTitle}</AlertTitle>
      {household.role === "owner"
        ? texts.households.lockedOwner(household.memberCount, household.memberLimit)
        : texts.households.lockedMember(household.memberCount, household.memberLimit)}
    </Alert>
  );
}
