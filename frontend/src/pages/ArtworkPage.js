import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {ArtworkGrid, SectionTitle} from "../components/ArtworkCard";
import {useTranslation} from "react-i18next";
import {AI_USAGE} from "../shared/aiUsage";
import {formatDate} from "../i18n";
import {api} from "../api";
import {useSession, isMember, isAdmin, toggleLike} from "../session";

const Empty = ({children}) => <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>{children}</Box>;
Empty.propTypes = {children: PropTypes.node};

// one row of a two-column grid, so the labels share a width in every language
const Detail = ({label, children}) => (
  <>
    <Box sx={{minWidth: 64, py: 0.75, color: "text.secondary"}}>{label}</Box>
    <Box sx={{minWidth: 0, py: 0.75, whiteSpace: "pre-wrap"}}>{children}</Box>
  </>
);
Detail.propTypes = {label: PropTypes.string.isRequired, children: PropTypes.node};

// One artwork under its artist (#users/<artist>/artworks/<id>): the full image, its
// details and likes, and more work by the same artist underneath.
const ArtworkPage = ({userId, artworkId}) => {
  const {t} = useTranslation("site");
  const {session} = useSession();
  const [artwork, setArtwork] = React.useState(null);
  const [error, setError] = React.useState("");
  const [others, setOthers] = React.useState(null);

  // reloaded when the viewer changes, since "liked" depends on who is looking
  const viewerId = session?.user.id;
  React.useEffect(() => {
    api(`/artworks/${encodeURIComponent(artworkId)}`).then((data) => setArtwork(data.artwork)).catch((failure) => setError(failure.message));
    api(`/users/${encodeURIComponent(userId)}/artworks`).then((data) => setOthers(data.artworks)).catch(() => setOthers([]));
  }, [artworkId, userId, viewerId]);

  if (error) return <Empty>{error}<Box sx={{mt: 2}}><Button href={`#users/${userId}`}>{t("artwork.backToArtist")}</Button></Box></Empty>;
  if (!artwork) return null;

  const owner = artwork.owner;
  const own = owner && owner.id === session?.user.id;
  const ai = AI_USAGE[artwork.aiUsage] || AI_USAGE.unspecified;
  const more = (others || []).filter((item) => item.id !== artwork.id);

  const like = async () => {
    if (!isMember(session)) {
      window.location.hash = session ? "#me/profile" : "#login";
      return;
    }
    setArtwork({...artwork, ...(await toggleLike(artwork))});
  };

  return (
    <>
      <Box sx={{display: "grid", gap: {xs: 3, md: 4}, gridTemplateColumns: {xs: "1fr", md: "minmax(0, 1fr) 340px"}, alignItems: "start"}}>
        <Box component="a" href={artwork.imageUrl} target="_blank" rel="noreferrer" title={t("artwork.openOriginal")} sx={{
          display: "flex", justifyContent: "center", borderRadius: 3, overflow: "hidden", bgcolor: "action.hover", cursor: "zoom-in",
        }}>
          <img src={artwork.imageUrl} alt={artwork.title} style={{display: "block", maxWidth: "100%", maxHeight: "82vh", objectFit: "contain"}} />
        </Box>

        <Box sx={{position: {md: "sticky"}, top: {md: 88}}}>
          {owner && (
            <Box component="a" href={`#users/${owner.id}`} sx={{"display": "flex", "alignItems": "center", "gap": 1.5, "color": "inherit", "textDecoration": "none", "&:hover .name": {color: "primary.main"}}}>
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%", bgcolor: "primary.main", color: "primary.contrastText",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none",
              }}>{owner.displayName.slice(0, 1)}</Box>
              <Box className="name" sx={{fontWeight: 700}}>{owner.displayName}</Box>
            </Box>
          )}
          <Box component="h1" sx={{m: 0, mt: 2.5, fontSize: {xs: 22, md: 26}, fontWeight: 800, lineHeight: 1.3}}>{artwork.title || t("untitled")}</Box>
          {artwork.description && <Box sx={{mt: 1.5, whiteSpace: "pre-wrap", lineHeight: 1.8}}>{artwork.description}</Box>}

          <Box sx={{display: "flex", gap: 1, mt: 2.5, flexWrap: "wrap"}}>
            {own ? (
              <Button variant="outlined" href={`#me/artwork/${encodeURIComponent(artwork.id)}`} startIcon={<EditOutlinedIcon />} sx={{borderRadius: 20}}>{t("artwork.edit")}</Button>
            ) : (
              <Button variant={artwork.liked ? "contained" : "outlined"} disableElevation onClick={like}
                startIcon={artwork.liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                sx={{borderRadius: 20, ...(artwork.liked && {"bgcolor": "#ff4060", "color": "#fff", "&:hover": {bgcolor: "#e8364f"}})}}>
                {artwork.liked ? t("artwork.liked") : t("artwork.like")} {artwork.likes}
              </Button>
            )}
            {!own && isAdmin(session) && (
              <Button variant="text" href={`#me/artwork/${encodeURIComponent(artwork.id)}`} startIcon={<EditOutlinedIcon />} sx={{borderRadius: 20}}>{t("artwork.manage")}</Button>
            )}
            <Button variant="text" href="#gallery" startIcon={<ViewInArOutlinedIcon />} sx={{borderRadius: 20}}>{t("artwork.viewIn3D")}</Button>
          </Box>

          <Box sx={{display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", columnGap: 2, fontSize: 14, mt: 3, pt: 2, borderTop: 1, borderColor: "divider"}}>
            <Detail label={t("artwork.author")}>{artwork.author || "--"}</Detail>
            <Detail label={t("artwork.character")}>{artwork.character || "--"}</Detail>
            <Detail label={t("artwork.ai")}>{ai.name}</Detail>
            <Detail label={t("artwork.publishedAt")}>{formatDate(artwork.createdAt)}</Detail>
          </Box>
          {artwork.story && (
            <Box sx={{mt: 2, pt: 2, borderTop: 1, borderColor: "divider"}}>
              <Box sx={{fontSize: 13, color: "text.secondary", mb: 1}}>{t("artwork.story")}</Box>
              <Box sx={{whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 14}}>{artwork.story}</Box>
            </Box>
          )}
        </Box>
      </Box>

      {owner && more.length > 0 && (
        <>
          <SectionTitle title={t("artwork.moreBy", {name: owner.displayName})} action={<Button href={`#users/${owner.id}`} size="small">{t("artwork.viewAll")}</Button>} />
          <ArtworkGrid artworks={more.slice(0, 10)} onChange={(updated) => setOthers((current) => current.map((item) => (item.id === updated.id ? updated : item)))} />
        </>
      )}
    </>
  );
};

ArtworkPage.propTypes = {userId: PropTypes.string.isRequired, artworkId: PropTypes.string.isRequired};

export default ArtworkPage;
