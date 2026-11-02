import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import {Box, useTheme} from "@mui/material";

const MEDALS = ["#e8b94a", "#b8bec7", "#c98a5a"];

/**
 * Registered artists, ranked by the likes their published works received.
 * @return {RankingList} ranking list
 */
export default function RankingList() {
  const theme = useTheme();
  // null while loading
  const [artists, setArtists] = React.useState(null);

  React.useEffect(() => {
    fetch("/api/artists/ranking")
        .then((response) => (response.ok ? response.json() : {artists: []}))
        .then((data) => setArtists(data.artists))
        .catch(() => setArtists([]));
  }, []);

  return (
    <div>
      <Box sx={{bgcolor: theme.palette.primary.main, color: "#fff", padding: "1em", borderRadius: "10px 10px 0 0px"}}>Artist Ranking</Box>
      <List sx={{width: "100%", bgcolor: "background.paper", borderRadius: "0 0 10px 10px"}}>
        {artists === null && <ListItem><ListItemText secondary="載入中…" /></ListItem>}
        {artists?.length === 0 && <ListItem><ListItemText secondary="還沒有藝術家上榜，成為第一個吧！" /></ListItem>}
        {artists?.map((artist, index) => (
          <React.Fragment key={artist.id}>
            {index > 0 && <Divider variant="inset" component="li" />}
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{bgcolor: MEDALS[index] || theme.palette.secondary.main, color: "#fff", fontWeight: 700}}>
                  {index + 1}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={artist.name} secondary={`♥ ${artist.likes} · ${artist.works} 件作品`} />
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </div>
  );
}
