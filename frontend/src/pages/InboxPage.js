import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import {useTranslation} from "react-i18next";

// Placeholder until messaging is built; notifications already cover reviews and likes.
const InboxPage = () => {
  const {t} = useTranslation("site");
  return (
    <Box sx={{py: 10, textAlign: "center", color: "text.secondary"}}>
      <MailOutlineIcon sx={{fontSize: 56, opacity: 0.5}} />
      <Box component="h1" sx={{fontSize: 22, fontWeight: 800, color: "text.primary", mt: 2, mb: 1}}>{t("inbox.title")}</Box>
      <Box>{t("inbox.text")}</Box>
      <Button href="#me/notifications" variant="outlined" sx={{mt: 3, borderRadius: 20}}>{t("inbox.viewNotifications")}</Button>
    </Box>
  );
};

export default InboxPage;
