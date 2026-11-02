import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";

const MEDALS = ["#e0a82e", "#a7afba", "#c4834f"];

export const useRanking = (limit) => {
  // null while loading
  const [artists, setArtists] = React.useState(null);
  React.useEffect(() => {
    fetch(`/api/artists/ranking?limit=${limit}`)
        .then((response) => (response.ok ? response.json() : {artists: []}))
        .then((data) => setArtists(data.artists))
        .catch(() => setArtists([]));
  }, [limit]);
  return artists;
};

// One ranked artist: place, name, likes, and up to three of their best liked works.
export const ArtistCard = ({artist, rank}) => (
  <Box component="a" href={`#users/${artist.id}`} sx={{
    "display": "block", "p": 2, "borderRadius": 3, "border": 1, "borderColor": "divider", "bgcolor": "background.paper", "minWidth": 0,
    "color": "inherit", "textDecoration": "none", "transition": "border-color 0.2s", "&:hover": {borderColor: "primary.main"},
  }}>
    <Box sx={{display: "flex", alignItems: "center", gap: 1.5}}>
      <Box sx={{
        width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, color: "#fff", bgcolor: MEDALS[rank - 1] || "text.disabled",
      }}>{rank}</Box>
      <Box sx={{minWidth: 0}}>
        <Box sx={{fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{artist.name}</Box>
        <Box sx={{fontSize: 12, color: "text.secondary"}}>♥ {artist.likes} · {artist.works} 件作品</Box>
      </Box>
    </Box>
    <Box sx={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75, mt: 1.5}}>
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{aspectRatio: "1 / 1", borderRadius: 1.5, overflow: "hidden", bgcolor: "action.hover"}}>
          {artist.previews[i] && <img src={artist.previews[i]} alt="" loading="lazy" style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />}
        </Box>
      ))}
    </Box>
  </Box>
);

ArtistCard.propTypes = {
  artist: PropTypes.shape({id: PropTypes.number, name: PropTypes.string, likes: PropTypes.number, works: PropTypes.number, previews: PropTypes.array}).isRequired,
  rank: PropTypes.number.isRequired,
};
