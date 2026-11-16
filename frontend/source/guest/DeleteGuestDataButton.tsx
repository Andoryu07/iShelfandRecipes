import { Button } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { deleteAccount } from "../api/authenticationApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { texts } from "../translations/cs";

export function DeleteGuestDataButton() {
  const { logOut } = useAuthentication();
  const [isOpen, setIsOpen] = useState(false);
  const mutation = useMutation({ mutationFn: () => deleteAccount(""), onSuccess: () => logOut() });
  return (
    <>
      <Button color="error" onClick={() => setIsOpen(true)} disabled={mutation.isPending}>
        {texts.guest.deleteData}
      </Button>
      <ConfirmationDialog
        message={isOpen ? texts.guest.deleteDataText : null}
        confirmLabel={texts.guest.deleteDataConfirm}
        onConfirm={() => {
          setIsOpen(false);
          mutation.mutate();
        }}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
