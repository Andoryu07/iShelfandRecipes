import { Typography } from "@mui/material";
import { texts } from "../translations/cs";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{texts.common.comingSoon}</Typography>
    </>
  );
}
