import { Box, Card, CardContent, Chip, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { usePlan } from "../plans/usePlan";
import { texts } from "../translations/cs";

export function AdSlot() {
  const plan = usePlan().data;
  if (!plan?.showsAds) {
    return null;
  }
  return (
    <Card variant="outlined" sx={{ my: 2, borderStyle: "dashed" }} aria-label={texts.ads.label}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Chip label={texts.ads.label} size="small" />
          <Link component={RouterLink} to="/profile/premium" variant="body2">
            {texts.ads.removeAds}
          </Link>
        </Stack>
        <Box sx={{ py: 2, textAlign: "center" }}>
          <Typography variant="subtitle1">{texts.ads.placeholderTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            {texts.ads.placeholderText}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
