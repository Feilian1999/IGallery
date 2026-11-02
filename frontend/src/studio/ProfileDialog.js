import * as React from "react";
import PropTypes from "prop-types";
import {useTheme} from "@mui/material/styles";
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
import "./admin.css";

// Profile settings in a centered dialog over whatever page is open (full screen on phones).
const ProfileDialog = ({open, onClose}) => {
  const {session} = useSession();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));

  // signed-out visitors get the login page instead
  React.useEffect(() => {
    if (open && session === null) window.location.hash = "#login";
  }, [open, session]);

  return (
    <Dialog open={open && Boolean(session)} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm" scroll="paper"
      PaperProps={{sx: {bgcolor: "background.paper", backgroundImage: "none", borderRadius: {sm: 4}}}}>
      <DialogTitle sx={{display: "flex", alignItems: "center", gap: 1, pr: 1.5}}>
        <Box sx={{flex: 1, fontWeight: 800}}>編輯個人資料</Box>
        {isMember(session) && <Button size="small" href={`#users/${session.user.id}`} sx={{borderRadius: 20}}>查看我的個人頁</Button>}
        <IconButton onClick={onClose} aria-label="關閉"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{p: 0}}>
        <div className="admin admin--dialog" data-mode={theme.palette.mode}>{session && <ProfilePage />}</div>
      </DialogContent>
    </Dialog>
  );
};

ProfileDialog.propTypes = {open: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired};

export default ProfileDialog;
