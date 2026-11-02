import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MailOutlineIcon from "@mui/icons-material/MailOutline";

// Placeholder until messaging is built; notifications already cover reviews and likes.
const InboxPage = () => (
  <Box sx={{py: 10, textAlign: "center", color: "text.secondary"}}>
    <MailOutlineIcon sx={{fontSize: 56, opacity: 0.5}} />
    <Box component="h1" sx={{fontSize: 22, fontWeight: 800, color: "text.primary", mt: 2, mb: 1}}>收信匣即將推出</Box>
    <Box>之後可以在這裡和創作者聯絡。作品被喜歡、審核結果等消息，目前都會出現在通知裡。</Box>
    <Button href="#me/notifications" variant="outlined" sx={{mt: 3, borderRadius: 20}}>查看通知</Button>
  </Box>
);

export default InboxPage;
