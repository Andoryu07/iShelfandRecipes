import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import {
  ButtonBase,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BottomSheet } from "../components/BottomSheet";
import { usePlan } from "../plans/usePlan";
import { texts } from "../translations/cs";
import { selectHousehold, useCurrentHousehold } from "./useCurrentHousehold";

export function HouseholdSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { household, households } = useCurrentHousehold();
  const plan = usePlan().data;
  const [isOpen, setIsOpen] = useState(false);
  if (!household) {
    return null;
  }
  const canAdd = plan ? households.length < plan.householdLimit : true;
  const isPremium = plan?.plan === "premium";
  return (
    <>
      <ButtonBase
        onClick={() => setIsOpen(true)}
        aria-label={texts.households.switch}
        sx={{ borderRadius: 1, justifyContent: "flex-start", color: "text.secondary", maxWidth: "100%" }}
      >
        <Typography variant="body2" noWrap>
          {household.name}
        </Typography>
        <ExpandMoreRoundedIcon fontSize="small" />
      </ButtonBase>
      <BottomSheet open={isOpen} onClose={() => setIsOpen(false)}>
        <DialogTitle>{texts.households.title}</DialogTitle>
        <DialogContent sx={{ px: 1 }}>
          <List>
            {households.map((candidate) => (
              <ListItemButton
                key={candidate.id}
                selected={candidate.id === household.id}
                onClick={() => {
                  selectHousehold(candidate.id);
                  setIsOpen(false);
                  if (location.pathname === "/households/add") {
                    navigate("/household");
                  }
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemText
                  primary={candidate.name}
                  secondary={[
                    texts.householdRoles[candidate.role],
                    candidate.isLocked ? texts.households.lockedShort : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
                {candidate.id === household.id && <CheckRoundedIcon color="primary" />}
              </ListItemButton>
            ))}
            <ListItemButton
              disabled={!canAdd && isPremium}
              onClick={() => {
                setIsOpen(false);
                navigate(canAdd ? "/households/add" : "/profile/premium");
              }}
              sx={{ borderRadius: 2, mt: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {canAdd ? <AddRoundedIcon /> : <LockRoundedIcon />}
              </ListItemIcon>
              <ListItemText
                primary={texts.households.add}
                secondary={
                  canAdd
                    ? null
                    : isPremium
                      ? texts.households.premiumLimitReached
                      : texts.households.morePremiumShort
                }
              />
            </ListItemButton>
          </List>
        </DialogContent>
      </BottomSheet>
    </>
  );
}
