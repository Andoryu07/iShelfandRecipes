import { Button, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { texts } from "../translations/cs";

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const { privacyPolicy } = texts;

  return (
    <main className="page">
      <Button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
        {privacyPolicy.back}
      </Button>
      <Typography variant="h4" component="h1" sx={{ mt: 1 }}>
        {privacyPolicy.title}
      </Typography>
      <Typography color="text.secondary">{privacyPolicy.effectiveFrom}</Typography>
      {privacyPolicy.sections.map((section) => (
        <section key={section.heading} className="section">
          <Typography variant="h6" component="h2" gutterBottom>
            {section.heading}
          </Typography>
          {section.paragraphs.map((paragraph) => (
            <Typography key={paragraph} component="p" sx={{ mb: 2 }}>
              {paragraph}
            </Typography>
          ))}
        </section>
      ))}
    </main>
  );
}
