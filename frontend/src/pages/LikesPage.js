import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {ArtworkGrid} from "../components/ArtworkCard";
import {api} from "../api";
import {useSession, isMember} from "../session";

// Artworks the signed-in member has liked, most recent first.
const LikesPage = () => {
  const {session} = useSession();
  const [artworks, setArtworks] = React.useState(null);
  const member = isMember(session);

  React.useEffect(() => {
    if (member) api("/me/likes").then((data) => setArtworks(data.artworks)).catch(() => setArtworks([]));
  }, [member]);

  const heading = <Box component="h1" sx={{fontSize: 26, fontWeight: 800, m: 0, mb: 3}}>喜歡的作品</Box>;

  if (session === undefined) return heading;
  if (!member) {
    return (
      <>
        {heading}
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>
          {session ? "訪客不能按喜歡，註冊成為會員後就能收藏喜歡的作品。" : "登入後就能收藏喜歡的作品。"}
          <Box sx={{mt: 2}}><Button variant="contained" disableElevation href={session ? "#me/profile" : "#login"} sx={{borderRadius: 20}}>{session ? "註冊成為會員" : "登入"}</Button></Box>
        </Box>
      </>
    );
  }
  return (
    <>
      {heading}
      {artworks && !artworks.length ? (
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>還沒有喜歡的作品，在作品上按 ♥ 就會收進這裡。</Box>
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
