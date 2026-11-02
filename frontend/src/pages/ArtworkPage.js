import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {ArtworkGrid, SectionTitle} from "../components/ArtworkCard";
import {AI_USAGE} from "../shared/aiUsage";
import {api} from "../api";
import {useSession, isMember, isAdmin, toggleLike} from "../session";

const Empty = ({children}) => <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>{children}</Box>;
Empty.propTypes = {children: PropTypes.node};

const Detail = ({label, children}) => (
  <Box sx={{display: "flex", gap: 2, py: 0.75, fontSize: 14}}>
    <Box sx={{width: 64, flex: "none", color: "text.secondary"}}>{label}</Box>
    <Box sx={{minWidth: 0, whiteSpace: "pre-wrap"}}>{children}</Box>
  </Box>
);
Detail.propTypes = {label: PropTypes.string.isRequired, children: PropTypes.node};

// One artwork under its artist (#users/<artist>/artworks/<id>): the full image, its
// details and likes, and more work by the same artist underneath.
const ArtworkPage = ({userId, artworkId}) => {
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

  if (error) return <Empty>{error}<Box sx={{mt: 2}}><Button href={`#users/${userId}`}>← 回到作者頁面</Button></Box></Empty>;
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
        <Box component="a" href={artwork.imageUrl} target="_blank" rel="noreferrer" title="開啟原圖" sx={{
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
          <Box component="h1" sx={{m: 0, mt: 2.5, fontSize: {xs: 22, md: 26}, fontWeight: 800, lineHeight: 1.3}}>{artwork.title || "未命名"}</Box>
          {artwork.description && <Box sx={{mt: 1.5, whiteSpace: "pre-wrap", lineHeight: 1.8}}>{artwork.description}</Box>}

          <Box sx={{display: "flex", gap: 1, mt: 2.5, flexWrap: "wrap"}}>
            {own ? (
              <Button variant="outlined" href={`#me/artwork/${encodeURIComponent(artwork.id)}`} startIcon={<EditOutlinedIcon />} sx={{borderRadius: 20}}>編輯作品</Button>
            ) : (
              <Button variant={artwork.liked ? "contained" : "outlined"} disableElevation onClick={like}
                startIcon={artwork.liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                sx={{borderRadius: 20, ...(artwork.liked && {"bgcolor": "#ff4060", "color": "#fff", "&:hover": {bgcolor: "#e8364f"}})}}>
                {artwork.liked ? "已收藏" : "喜歡"} {artwork.likes}
              </Button>
            )}
            {!own && isAdmin(session) && (
              <Button variant="text" href={`#me/artwork/${encodeURIComponent(artwork.id)}`} startIcon={<EditOutlinedIcon />} sx={{borderRadius: 20}}>管理</Button>
            )}
            <Button variant="text" href="#gallery" startIcon={<ViewInArOutlinedIcon />} sx={{borderRadius: 20}}>在 3D 畫廊觀看</Button>
          </Box>

          <Box sx={{mt: 3, pt: 2, borderTop: 1, borderColor: "divider"}}>
            <Detail label="作者">{artwork.author || "--"}</Detail>
            <Detail label="角色">{artwork.character || "--"}</Detail>
            <Detail label="AI">{ai.name}</Detail>
            <Detail label="發布於">{new Date(artwork.createdAt).toLocaleDateString("zh-TW")}</Detail>
          </Box>
          {artwork.story && (
            <Box sx={{mt: 2, pt: 2, borderTop: 1, borderColor: "divider"}}>
              <Box sx={{fontSize: 13, color: "text.secondary", mb: 1}}>作品背後的故事</Box>
              <Box sx={{whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 14}}>{artwork.story}</Box>
            </Box>
          )}
        </Box>
      </Box>

      {owner && more.length > 0 && (
        <>
          <SectionTitle title={`${owner.displayName} 的其他作品`} action={<Button href={`#users/${owner.id}`} size="small">查看全部 →</Button>} />
          <ArtworkGrid artworks={more.slice(0, 10)} onChange={(updated) => setOthers((current) => current.map((item) => (item.id === updated.id ? updated : item)))} />
        </>
      )}
    </>
  );
};

ArtworkPage.propTypes = {userId: PropTypes.string.isRequired, artworkId: PropTypes.string.isRequired};

export default ArtworkPage;
