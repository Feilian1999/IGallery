import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {useTranslation} from "react-i18next";
import {ArtworkGrid} from "../components/ArtworkCard";
import {api} from "../api";
import {useSession, isMember} from "../session";

// Artworks the signed-in member has liked, most recent first.
const LikesPage = () => {
  const {t} = useTranslation("site");
  const {session} = useSession();
  const [artworks, setArtworks] = React.useState(null);
  const member = isMember(session);

  React.useEffect(() => {
    if (member) api("/me/likes").then((data) => setArtworks(data.artworks)).catch(() => setArtworks([]));
  }, [member]);

  const heading = <Box component="h1" sx={{fontSize: 26, fontWeight: 800, m: 0, mb: 3}}>{t("likes.title")}</Box>;

  if (session === undefined) return heading;
  if (!member) {
    return (
      <>
        {heading}
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>
          {session ? t("likes.guestHint") : t("likes.loginHint")}
          <Box sx={{mt: 2}}><Button variant="contained" disableElevation href={session ? "#me/profile" : "#login"} sx={{borderRadius: 20}}>{session ? t("likes.register") : t("top.login")}</Button></Box>
        </Box>
      </>
    );
  }
  return (
    <>
      {heading}
      {artworks && !artworks.length ? (
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>{t("likes.empty")}</Box>
      ) : (
        // unliking here removes the card
        <ArtworkGrid artworks={artworks} onChange={(updated) => setArtworks((current) => (updated.liked ?
          current.map((item) => (item.id === updated.id ? updated : item)) :
          current.filter((item) => item.id !== updated.id)))} />
      )}
    </>
  );
};

export default LikesPage;
