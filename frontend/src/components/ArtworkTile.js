import * as React from "react";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";

// A square artwork thumbnail; clicking it opens the 3D gallery.
const ArtworkTile = ({artwork}) => {
  if (!artwork) {
    return <Box sx={{aspectRatio: "1/1", borderRadius: 1, bgcolor: "action.hover"}} />;
  }
  return (
    <Box
      component="a"
      href="#gallery"
      title={artwork.title}
      sx={{display: "block", position: "relative", aspectRatio: "1/1", overflow: "hidden", borderRadius: 1}}
    >
      <img src={artwork.previewUrl} alt={artwork.title} loading="lazy" style={{width: "100%", height: "100%", objectFit: "cover"}} />
      <Box sx={{position: "absolute", left: 0, right: 0, bottom: 0, p: 1, color: "#fff", fontSize: 14,
        background: "linear-gradient(transparent, rgba(0,0,0,0.6))"}}>
        {artwork.title || "未命名"}
      </Box>
    </Box>
  );
};

ArtworkTile.propTypes = {
  artwork: PropTypes.shape({
    title: PropTypes.string,
    previewUrl: PropTypes.string.isRequired,
  }),
};

export default ArtworkTile;
