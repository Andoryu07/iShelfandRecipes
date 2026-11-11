import { Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { texts } from "../translations/cs";

export function NotFoundPage() {
  return (
    <main className="centeredPage">
      <Typography gutterBottom>{texts.notFound}</Typography>
      <Button component={RouterLink} to="/" variant="contained">
        {texts.applicationName}
      </Button>
    </main>
  );
}
