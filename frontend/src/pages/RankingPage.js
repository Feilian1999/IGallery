import * as React from "react";
import Box from "@mui/material/Box";
import {ArtistCard, useRanking} from "../components/ArtistRanking";

// The full artist ranking: by likes received on published works.
const RankingPage = () => {
  const artists = useRanking(50);
  return (
    <>
      <Box component="h1" sx={{fontSize: 26, fontWeight: 800, m: 0}}>藝術家排行</Box>
      <Box sx={{color: "text.secondary", mt: 0.5, mb: 3, fontSize: 14}}>依已公開作品收到的喜歡數排名，同分時作品多的在前。</Box>
      {artists === null ? null : !artists.length ? (
        <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>還沒有藝術家上榜，上傳作品並通過審核就有機會出現在這裡。</Box>
      ) : (
        <Box sx={{display: "grid", gap: 2, gridTemplateColumns: {xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)"}}}>
          {artists.map((artist, i) => <ArtistCard key={artist.id} artist={artist} rank={i + 1} />)}
        </Box>
      )}
    </>
  );
};

export default RankingPage;
