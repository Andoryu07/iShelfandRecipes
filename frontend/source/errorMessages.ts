import { ApiError } from "./api/apiClient";
import { texts } from "./translations/cs";

export function describeError(error: unknown, messagesByStatus: Record<number, string> = {}): string {
  if (error instanceof ApiError) {
    return (
      messagesByStatus[error.status] ??
      (error.status === 422 ? texts.authentication.invalidInput : texts.common.unexpectedError)
    );
  }
  if (error instanceof TypeError) {
    return texts.common.offline;
  }
  return texts.common.unexpectedError;
}
