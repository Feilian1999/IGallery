import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Pagination from "@mui/material/Pagination";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import {ArtworkGrid, SectionTitle} from "../components/ArtworkCard";
import {ArtistCard, useRanking} from "../components/ArtistRanking";
import {fetchArtworks} from "../services/artworks";
import {useSession} from "../session";

const PAGE_SIZE = 24;

const matches = (artwork, query) => [artwork.title, artwork.author, artwork.character, artwork.owner?.displayName]
    .some((text) => text && text.toLowerCase().includes(query.toLowerCase()));

// The way into the 3D gallery, using three of the artworks as a collage.
const GalleryBanner = ({artworks}) => (
  <Box component="a" href="#gallery" sx={{
    position: "relative", display: "grid", gridTemplateColumns: {xs: "1fr", md: "1.1fr 1fr"}, gap: 3, alignItems: "center",
    p: {xs: 3, md: 5}, borderRadius: 4, overflow: "hidden", textDecoration: "none", color: "#f4efe7",
    background: "radial-gradient(900px 400px at 85% 20%, rgba(232,196,138,0.25), transparent 60%), linear-gradient(135deg, #17141f 0%, #2a2235 100%)",
  }}>
    <Box>
      <Box sx={{fontSize: 12, letterSpacing: "0.3em", opacity: 0.6}}>ONLINE EXHIBITION</Box>
      <Box sx={{fontFamily: "\"Noto Serif TC\", serif", fontSize: {xs: 28, md: 40}, fontWeight: 700, mt: 1, lineHeight: 1.3}}>走進 3D 展廳</Box>
      <Box sx={{mt: 1.5, opacity: 0.75, maxWidth: 420, lineHeight: 1.8}}>操控角色在美術館裡散步，走到畫作前細看，或穿過傳送門前往懸浮展廳。</Box>
      <Button component="span" variant="contained" startIcon={<ViewInArOutlinedIcon />} disableElevation
        sx={{"mt": 3, "borderRadius": 20, "px": 3, "bgcolor": "#e8c48a", "color": "#17130e", "&:hover": {bgcolor: "#f0d3a4"}}}>
        進入畫廊
      </Button>
    </Box>
    <Box sx={{display: {xs: "none", md: "flex"}, justifyContent: "center", alignItems: "center", height: 260, position: "relative"}}>
      {artworks.slice(0, 3).map((artwork, i) => (
        <Box key={artwork.id} sx={{
          position: "absolute", width: 170, aspectRatio: "3 / 4", borderRadius: 2, overflow: "hidden", border: "6px solid #f4efe7",
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)", transform: `translateX(${(i - 1) * 130}px) rotate(${(i - 1) * 7}deg)`, zIndex: i === 1 ? 2 : 1,
        }}>
          <img src={artwork.previewUrl} alt="" style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
        </Box>
      ))}
    </Box>
  </Box>
);

GalleryBanner.propTypes = {artworks: PropTypes.array.isRequired};

const HomePage = ({query}) => {
  const {session} = useSession();
  // null while loading
  const [artworks, setArtworks] = React.useState(null);
  const [order, setOrder] = React.useState("curated");
  const [page, setPage] = React.useState(1);
  const ranking = useRanking(5);

  // reloaded when the viewer signs in or out, since "liked" depends on who is looking
  const viewerId = session?.user.id;
  React.useEffect(() => {
    fetchArtworks().then(setArtworks).catch(() => setArtworks([]));
  }, [viewerId]);

  React.useEffect(() => setPage(1), [query, order]);

  const replace = (updated) => setArtworks((current) => current.map((item) => (item.id === updated.id ? updated : item)));

  const sorted = artworks && (order === "latest" ? [...artworks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : artworks);
  const filtered = sorted && (query ? sorted.filter((artwork) => matches(artwork, query)) : sorted);
  const pageCount = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  // a new search or order can leave the page past the end until the reset below lands
  const current = Math.min(page, pageCount);
  const shown = filtered && filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const orderSwitch = (
    <ToggleButtonGroup size="small" exclusive value={order} onChange={(_, value) => value && setOrder(value)}>
      <ToggleButton value="curated" sx={{px: 2}}>精選</ToggleButton>
      <ToggleButton value="latest" sx={{px: 2}}>最新</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <>
      {!query && (
        <>
          {artworks && artworks.length > 0 && <GalleryBanner artworks={artworks} />}
          {ranking && ranking.length > 0 && (
            <>
              <SectionTitle title="藝術家排行" action={<Button href="#ranking" size="small">查看全部 →</Button>} />
              <Box sx={{display: "grid", gap: 2, gridTemplateColumns: {xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)"}}}>
                {ranking.map((artist, i) => <ArtistCard key={artist.id} artist={artist} rank={i + 1} />)}
              </Box>
            </>
          )}
        </>
      )}
      <SectionTitle first={Boolean(query)} title={query ? `「${query}」的搜尋結果${filtered ? `（${filtered.length}）` : ""}` : "作品"} action={orderSwitch} />
      {filtered && !filtered.length ? (
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>{query ? "找不到符合的作品，換個關鍵字試試。" : "還沒有作品。"}</Box>
      ) : (
        <ArtworkGrid artworks={shown} onChange={replace} />
      )}
      {pageCount > 1 && (
        <Box sx={{display: "flex", justifyContent: "center", mt: 4}}>
          <Pagination count={pageCount} page={current} onChange={(_, value) => {
            setPage(value);
            window.scrollTo({top: 0, behavior: "smooth"});
          }} color="primary" />
        </Box>
      )}
    </>
  );
};

HomePage.propTypes = {query: PropTypes.string};

export default HomePage;
