import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Unstable_Grid2";
import ArtworkTile from "../components/ArtworkTile";
import {Pagination} from "@mui/material";
import FreeSolo from "../components/Search";
import Slider from "../components/Slider";
import RankingList from "../components/RankingList";
import {useTheme} from "@mui/material/styles";
import {fetchArtworks} from "../services/artworks";
import {useSession, isMember, toggleLike} from "../session";

const PAGE_SIZE = 12;

const matches = (artwork, query) => [artwork.title, artwork.author, artwork.character]
    .some((text) => text && text.toLowerCase().includes(query.toLowerCase()));

const HomePage = () => {
  const theme = useTheme();
  const {session} = useSession();
  // null while loading
  const [artworks, setArtworks] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  // reloaded when the viewer signs in or out, since "liked" depends on who is looking
  const viewerId = session?.user.id;
  React.useEffect(() => {
    fetchArtworks().then(setArtworks).catch(() => setArtworks([]));
  }, [viewerId]);

  const like = async (artwork) => {
    if (!isMember(session)) {
      window.location.hash = session ? "#me/profile" : "#login";
      return;
    }
    const result = await toggleLike(artwork);
    setArtworks((current) => current.map((item) => (item.id === artwork.id ? {...item, ...result} : item)));
  };

  const filtered = (artworks || []).filter((artwork) => !query || matches(artwork, query));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };


  return (
    // layout
    <Grid
      container
      columnSpacing={3}
      rowSpacing={2}
      direction="row"

      sx={{minHeight: "100vh", margin: 0, bgcolor: theme.palette.background.default}}
    >
      {/* layout: artist ranking start. invisible if lower than md */}
      <Grid sx={{[theme.breakpoints.down("md")]: {display: "none"}}} xs={0} sm={0} md={3}>
        <Box sx={{height: "30vh", marginTop: "10px"}}/>
        <Box sx={{height: "50vh", marginTop: "10px"}}>
          <RankingList/>
        </Box>
      </Grid>
      {/* layout: main post display. */}
      <Grid
        container
        xs={12}
        sm={12}
        md={9}
        columnSpacing={3}
        rowSpacing={2}
        direction="row"
        alignItems="center"
        style={{minHeight: "100vh"}}
      >
        {/* top slider */}
        <Grid xs={12}>
          <Box sx={{height: "30vh"}}>
            <Slider/>
          </Box>
        </Grid>
        {/* artwork topic and search */}
        <Grid container xs={12}><Grid xs={9}><h2 style={{color: theme.palette.text.primary}}>Artworks</h2></Grid><Grid container justifyContent='end' alignItems="center" xs><Box sx={{height: "5vh", width: "20em"}}><FreeSolo options={(artworks || []).map((artwork) => artwork.title).filter(Boolean)} onSearch={handleSearch}/></Box></Grid></Grid>
        {/* artwork main area */}
        {artworks === null ? [1, 2, 3, 4].map((index) => (
          <Grid xs={12} sm={6} md={4} lg={3} key={index}>
            <ArtworkTile />
          </Grid>
        )) : shown.map((artwork) => (
          <Grid xs={12} sm={6} md={4} lg={3} key={artwork.id}>
            <ArtworkTile artwork={artwork} canLike={artwork.owner?.id !== session?.user.id} onLike={() => like(artwork)}/>
          </Grid>
        ))}
        {artworks !== null && !filtered.length && (
          <Grid xs={12}><p style={{color: theme.palette.text.secondary}}>{query ? "找不到符合的作品" : "還沒有作品"}</p></Grid>
        )}
        {/* pagination */}
        <Grid container alignItems="center" justifyContent="center" rowSpacing={-5} xs={12}>
          <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} variant="outlined" color="primary" />
        </Grid>
      </Grid>


    </Grid>


  );
};

export default HomePage;

