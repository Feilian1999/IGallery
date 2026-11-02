import * as React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PropTypes from "prop-types";
import {AI_USAGE} from "../shared/aiUsage";

// A square artwork thumbnail with its title, artist, AI label and likes.
// Clicking the image opens the 3D gallery.
const ArtworkTile = ({artwork, canLike, onLike}) => {
  if (!artwork) {
    return <Box sx={{aspectRatio: "1/1", borderRadius: 1, bgcolor: "action.hover"}} />;
  }
  const aiLabel = AI_USAGE[artwork.aiUsage]?.short;
  return (
    <Box sx={{position: "relative", aspectRatio: "1/1", overflow: "hidden", borderRadius: 1}}>
      <a href="#gallery" title={artwork.title}>
        <img src={artwork.previewUrl} alt={artwork.title} loading="lazy" style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
      </a>
      {aiLabel && (
        <Box sx={{position: "absolute", top: 8, left: 8, px: 1, py: 0.25, borderRadius: 4, fontSize: 11, fontWeight: 600,
          color: "#fff", bgcolor: "rgba(110, 80, 190, 0.9)"}}>
          {aiLabel}
        </Box>
      )}
      <Box sx={{position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "flex-end", gap: 1,
        p: 1, color: "#fff", background: "linear-gradient(transparent, rgba(0,0,0,0.65))", pointerEvents: "none"}}>
        <Box sx={{flex: 1, minWidth: 0}}>
          <Box sx={{fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{artwork.title || "未命名"}</Box>
          {artwork.owner && <Box sx={{fontSize: 11, opacity: 0.75}}>{artwork.owner.displayName}</Box>}
        </Box>
        <Box sx={{display: "flex", alignItems: "center", fontSize: 13, pointerEvents: "auto"}}>
          <IconButton
            size="small"
            sx={{color: artwork.liked ? "#ff6b81" : "#fff"}}
            disabled={!canLike}
            onClick={onLike}
            aria-label={artwork.liked ? "取消喜歡" : "喜歡"}
            title={canLike ? "" : "這是你的作品"}
          >
            {artwork.liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
          {artwork.likes}
        </Box>
      </Box>
    </Box>
  );
};

ArtworkTile.propTypes = {
  artwork: PropTypes.shape({
    title: PropTypes.string,
    previewUrl: PropTypes.string.isRequired,
    aiUsage: PropTypes.string,
    likes: PropTypes.number,
    liked: PropTypes.bool,
    owner: PropTypes.shape({displayName: PropTypes.string}),
  }),
  canLike: PropTypes.bool,
  onLike: PropTypes.func,
};

export default ArtworkTile;
