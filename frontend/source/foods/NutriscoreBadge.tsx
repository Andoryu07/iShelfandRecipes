import { Box } from "@mui/material";
import type { NutriscoreGrade } from "../api/types";
import { texts } from "../translations/cs";

const gradeColors: Record<NutriscoreGrade, string> = {
  a: "#038141",
  b: "#85bb2f",
  c: "#fecb02",
  d: "#ee8100",
  e: "#e63e11",
};

export function NutriscoreBadge({ grade }: { grade: NutriscoreGrade }) {
  return (
    <Box
      aria-label={texts.nutrition.nutriscore(grade.toUpperCase())}
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: gradeColors[grade],
        color: grade === "c" ? "#222" : "#fff",
        fontWeight: 800,
        fontSize: 13,
        whiteSpace: "nowrap",
      }}
    >
      Nutri-Score {grade.toUpperCase()}
    </Box>
  );
}
