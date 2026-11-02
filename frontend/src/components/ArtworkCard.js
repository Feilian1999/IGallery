import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {AI_USAGE} from "../shared/aiUsage";
import {useSession, isMember, toggleLike} from "../session";

// An artwork in a grid: square image with the AI label and a like button on it,
// title and artist underneath. Clicking the image opens the artwork under its artist.
export const ArtworkCard = ({artwork, onChange}) => {
  const {session} = useSession();
  if (!artwork) {
    return (
      <Box>
        <Box sx={{aspectRatio: "1 / 1", borderRadius: 2, bgcolor: "action.hover"}} />
        <Box sx={{mt: 1, height: 14, width: "70%", borderRadius: 1, bgcolor: "action.hover"}} />
      </Box>
    );
  }
  const own = artwork.owner && artwork.owner.id === session?.user.id;
  const aiLabel = AI_USAGE[artwork.aiUsage]?.short;

  const like = async (event) => {
    event.preventDefault();
    if (!isMember(session)) {
      window.location.hash = session ? "#me/profile" : "#login";
      return;
    }
    onChange({...artwork, ...(await toggleLike(artwork))});
  };

  return (
    <Box>
      <Box component="a" href={artwork.owner ? `#users/${artwork.owner.id}/artworks/${encodeURIComponent(artwork.id)}` : "#gallery"} title={artwork.title} sx={{
        "position": "relative", "display": "block", "aspectRatio": "1 / 1", "borderRadius": 2, "overflow": "hidden", "bgcolor": "action.hover",
        "& img": {transition: "transform 0.3s ease"}, "&:hover img": {transform: "scale(1.03)"},
      }}>
        <img src={artwork.previewUrl} alt={artwork.title} loading="lazy" style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
        {aiLabel && (
          <Box sx={{position: "absolute", top: 8, left: 8, px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700, color: "#fff", bgcolor: "rgba(103, 80, 164, 0.92)"}}>
            {aiLabel}
          </Box>
        )}
        {!own && (
          <IconButton
            onClick={like}
            aria-label={artwork.liked ? "取消喜歡" : "喜歡"}
            sx={{position: "absolute", right: 4, bottom: 4, color: artwork.liked ? "#ff4060" : "#fff", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))"}}
          >
            {artwork.liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        )}
      </Box>
      <Box sx={{mt: 1, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{artwork.title || "未命名"}</Box>
      <Box sx={{mt: 0.5, display: "flex", alignItems: "center", gap: 0.75, fontSize: 12, color: "text.secondary"}}>
        <Box component={artwork.owner ? "a" : "span"} href={artwork.owner ? `#users/${artwork.owner.id}` : undefined} sx={{
          "flex": 1, "minWidth": 0, "display": "flex", "alignItems": "center", "gap": 0.75, "color": "inherit", "textDecoration": "none",
          "&:hover": {color: "text.primary"},
        }}>
          <Box sx={{width: 20, height: 20, borderRadius: "50%", bgcolor: "primary.main", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flex: "none"}}>
            {(artwork.owner?.displayName || "?").slice(0, 1)}
          </Box>
          <Box sx={{flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{artwork.owner?.displayName || "—"}</Box>
        </Box>
        <Box sx={{flex: "none"}}>♥ {artwork.likes}</Box>
      </Box>
    </Box>
  );
};

ArtworkCard.propTypes = {
  artwork: PropTypes.object,
  onChange: PropTypes.func,
};

export const ArtworkGrid = ({artworks, onChange, loadingCount = 8}) => (
  <Box sx={{display: "grid", gap: {xs: 2, md: 3}, gridTemplateColumns: {xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(5, 1fr)", xl: "repeat(6, 1fr)"}}}>
    {artworks === null ?
      Array.from({length: loadingCount}, (_, i) => <ArtworkCard key={i} />) :
      artworks.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} onChange={onChange} />)}
  </Box>
);

ArtworkGrid.propTypes = {
  artworks: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  loadingCount: PropTypes.number,
};

export const SectionTitle = ({title, action, first}) => (
  <Box sx={{display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 2, mt: first ? 0 : 5}}>
    <Box component="h2" sx={{m: 0, fontSize: 20, fontWeight: 700}}>{title}</Box>
    {action}
  </Box>
);

// `first`: the page's opening section, so no space above it
SectionTitle.propTypes = {title: PropTypes.string.isRequired, action: PropTypes.node, first: PropTypes.bool};
