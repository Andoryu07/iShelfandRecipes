import { ApiError } from "../api/apiClient";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

const messagesByDetail: Record<string, string> = {
  "The household limit is reached": texts.households.limitReached,
  "User already belongs to this household": texts.households.alreadyMember,
  "Guests cannot join households": texts.guest.cannotJoin,
  "This household cannot be shared": texts.households.cannotBeShared,
  "The household is full": texts.premium.householdFullForApplicant,
};

export function describeHouseholdError(error: unknown): string {
  if (error instanceof ApiError && typeof error.detail === "string" && messagesByDetail[error.detail]) {
    return messagesByDetail[error.detail];
  }
  return describeError(error, { 404: texts.householdSetup.invalidInviteCode });
}
