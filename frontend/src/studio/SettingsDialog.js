import * as React from "react";
import PropTypes from "prop-types";
import {useTheme} from "@mui/material/styles";
import {useTranslation} from "react-i18next";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {useSession, isMember} from "../session";
import ProfilePage from "./ProfilePage";
import CommissionSettings from "./CommissionSettings";
import "./admin.css";

const SECTIONS = {
  profile: {title: "settings.profile", Content: ProfilePage},
  commissions: {title: "settings.commissions", Content: CommissionSettings},
};

// Account settings in a centered dialog over whatever page is open (full screen on phones):
// `section` is "profile" (#me/profile) or "commissions" (#me/commissions).
const SettingsDialog = ({open, section, onClose}) => {
  const {t} = useTranslation("studio");
  const {session} = useSession();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const {title, Content} = SECTIONS[section] || SECTIONS.profile;

  // signed-out visitors get the login page instead
  React.useEffect(() => {
    if (open && session === null) window.location.hash = "#login";
  }, [open, session]);

  return (
    <Dialog open={open && Boolean(session)} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm" scroll="paper"
      PaperProps={{sx: {bgcolor: "background.paper", backgroundImage: "none", borderRadius: {sm: 4}}}}>
      <DialogTitle sx={{display: "flex", alignItems: "center", gap: 1, pr: 1.5}}>
        <Box sx={{flex: 1, fontWeight: 800}}>{t(title)}</Box>
        {isMember(session) && <Button size="small" href={`#users/${session.user.id}`} sx={{borderRadius: 20}}>{t("settings.viewProfile")}</Button>}
        <IconButton onClick={onClose} aria-label={t("settings.close")}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{p: 0}}>
        <div className="admin admin--dialog" data-mode={theme.palette.mode}>{/* keyed so switching sections starts each form fresh */}
          {session && <Content key={section} />}</div>
      </DialogContent>
    </Dialog>
  );
};

SettingsDialog.propTypes = {open: PropTypes.bool.isRequired, section: PropTypes.string, onClose: PropTypes.func.isRequired};

export default SettingsDialog;
