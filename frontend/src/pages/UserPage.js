import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import {ArtworkGrid} from "../components/ArtworkCard";
import {api} from "../api";
import {useSession} from "../session";

const TABS = ["works", "commissions", "favorites"];

const Empty = ({children}) => <Box sx={{py: 8, textAlign: "center", color: "text.secondary"}}>{children}</Box>;
Empty.propTypes = {children: PropTypes.node};

// What the artist offers: open or closed, terms, price plans and how to reach them.
const Commissions = ({user, self}) => {
  const {open, info, contact, plans} = user.commission;
  if (!open && !info && !plans.length) {
    return (
      <Empty>
        {self ? "你還沒有設定約稿資訊。" : `${user.displayName} 目前沒有開放約稿。`}
        {self && <Box sx={{mt: 2}}><Button variant="contained" disableElevation href="#me/profile" sx={{borderRadius: 20}}>設定約稿</Button></Box>}
      </Empty>
    );
  }
  return (
    <Box sx={{maxWidth: 860}}>
      <Box sx={{display: "inline-flex", alignItems: "center", gap: 1, px: 1.5, py: 0.5, borderRadius: 20, fontSize: 13, fontWeight: 700,
        color: open ? "success.main" : "text.secondary", bgcolor: open ? "rgba(46, 160, 67, 0.12)" : "action.hover"}}>
        <Box sx={{width: 8, height: 8, borderRadius: "50%", bgcolor: open ? "success.main" : "text.disabled"}} />
        {open ? "接受約稿中" : "暫停接受約稿"}
      </Box>
      {info && <Box sx={{mt: 2.5, whiteSpace: "pre-wrap", lineHeight: 1.9}}>{info}</Box>}
      {plans.length > 0 && (
        <Box sx={{display: "grid", gap: 2, mt: 3, gridTemplateColumns: {xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)"}}}>
          {plans.map((plan, i) => (
            <Box key={i} sx={{p: 2.5, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper"}}>
              <Box sx={{fontWeight: 700}}>{plan.title}</Box>
              {plan.price && <Box sx={{mt: 0.5, fontSize: 20, fontWeight: 800, color: "primary.main"}}>{plan.price}</Box>}
              {plan.description && <Box sx={{mt: 1, fontSize: 13, color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.7}}>{plan.description}</Box>}
            </Box>
          ))}
        </Box>
      )}
      {open && contact && (
        <Box sx={{mt: 3, p: 2.5, borderRadius: 3, bgcolor: "action.hover"}}>
          <Box sx={{fontSize: 12, color: "text.secondary", mb: 0.5}}>約稿請聯絡</Box>
          <Box sx={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>{contact}</Box>
        </Box>
      )}
    </Box>
  );
};

Commissions.propTypes = {user: PropTypes.object.isRequired, self: PropTypes.bool};

// An artist's public page: profile header, then their works, commissions and favorites.
const UserPage = ({userId, tab: requestedTab}) => {
  const tab = TABS.includes(requestedTab) ? requestedTab : "works";
  const [profile, setProfile] = React.useState(null);
  const [error, setError] = React.useState("");
  const [works, setWorks] = React.useState(null);
  const [favorites, setFavorites] = React.useState(null);
  const {session} = useSession();

  // reloaded when the viewer signs in or out: "self", liked hearts and private favorites depend on who is looking
  const viewerId = session?.user.id;
  // the viewer's own account, as text, so editing your profile in the dialog refreshes the header
  const viewerProfile = session ? JSON.stringify(session.user) : "";
  React.useEffect(() => {
    api(`/users/${encodeURIComponent(userId)}`).then(setProfile).catch((failure) => setError(failure.message));
  }, [userId, viewerProfile]);

  React.useEffect(() => {
    setFavorites(null);
    api(`/users/${encodeURIComponent(userId)}/artworks`).then((data) => setWorks(data.artworks)).catch(() => setWorks([]));
  }, [userId, viewerId]);

  React.useEffect(() => {
    if (tab !== "favorites" || favorites) return;
    api(`/users/${encodeURIComponent(userId)}/favorites`).then((data) => setFavorites(data.artworks)).catch((failure) => setFavorites(failure.status === 403 ? "private" : []));
  }, [tab, userId, favorites]);

  if (error) return <Empty>{error}</Empty>;
  if (!profile) return null;
  const {user, stats, self} = profile;

  const replaceIn = (setList) => (updated) => setList((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  const covers = (works || []).slice(0, 4);

  return (
    <>
      {/* cover: a blurred collage of their work */}
      <Box sx={{position: "relative", height: {xs: 140, md: 220}, borderRadius: 4, overflow: "hidden",
        background: "linear-gradient(135deg, #2a2235 0%, #6750A4 100%)"}}>
        <Box sx={{position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, covers.length)}, 1fr)`, filter: "blur(18px) saturate(1.2)", transform: "scale(1.15)", opacity: 0.85}}>
          {covers.map((artwork) => <img key={artwork.id} src={artwork.previewUrl} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />)}
        </Box>
      </Box>

      <Box sx={{display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: {xs: 2, md: 3}, px: {xs: 1, md: 4}, mt: 1.5, position: "relative"}}>
        <Box sx={{
          width: {xs: 88, md: 120}, height: {xs: 88, md: 120}, mt: {xs: -6, md: -8}, borderRadius: "50%", flex: "none", border: 4, borderColor: "background.default",
          bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: {xs: 36, md: 48}, fontWeight: 800,
        }}>{user.displayName.slice(0, 1)}</Box>
        <Box sx={{flex: 1, minWidth: 180}}>
          <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap"}}>
            <Box component="h1" sx={{m: 0, fontSize: {xs: 22, md: 28}, fontWeight: 800}}>{user.displayName}</Box>
            {user.role === "admin" && <Box sx={{px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700, bgcolor: "action.selected", color: "primary.main"}}>管理者</Box>}
            {user.commission.open && <Box sx={{px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 700, color: "success.main", bgcolor: "rgba(46, 160, 67, 0.12)"}}>接受約稿</Box>}
          </Box>
          <Box sx={{color: "text.secondary", fontSize: 14}}>@{user.username} · {new Date(user.createdAt).toLocaleDateString("zh-TW")} 加入</Box>
        </Box>
        <Box sx={{display: "flex", gap: 1}}>
          {self ? (
            <>
              <Button href="#me/profile" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{borderRadius: 20}}>編輯個人資料</Button>
              <Button href="#me/new" variant="contained" disableElevation startIcon={<AddPhotoAlternateOutlinedIcon />} sx={{borderRadius: 20}}>發布作品</Button>
            </>
          ) : (
            <>
              {user.commission.open && <Button href={`#users/${user.id}/commissions`} variant="contained" disableElevation startIcon={<BrushOutlinedIcon />} sx={{borderRadius: 20}}>約稿</Button>}
              <Button href="#inbox" variant="outlined" startIcon={<MailOutlineIcon />} sx={{borderRadius: 20}}>傳送訊息</Button>
            </>
          )}
        </Box>
      </Box>

      <Box sx={{px: {xs: 1, md: 4}, mt: 2}}>
        {user.bio && <Box sx={{whiteSpace: "pre-wrap", lineHeight: 1.8, maxWidth: 760}}>{user.bio}</Box>}
        <Box sx={{display: "flex", gap: 3, mt: 1.5, fontSize: 14, color: "text.secondary"}}>
          <span><Box component="b" sx={{color: "text.primary"}}>{stats.works}</Box> 件作品</span>
          <span><Box component="b" sx={{color: "text.primary"}}>{stats.likes}</Box> 個喜歡</span>
          {stats.favorites !== null && <span><Box component="b" sx={{color: "text.primary"}}>{stats.favorites}</Box> 件收藏</span>}
        </Box>
      </Box>

      <Box sx={{borderBottom: 1, borderColor: "divider", mt: 3, mb: 3}}>
        <Tabs value={tab} onChange={(_, value) => {
          window.location.hash = `#users/${user.id}${value === "works" ? "" : `/${value}`}`;
        }}>
          <Tab value="works" label={`作品 ${stats.works}`} />
          <Tab value="commissions" label="約稿" />
          <Tab value="favorites" label={stats.favorites === null ? <Box sx={{display: "flex", alignItems: "center", gap: 0.5}}><LockOutlinedIcon sx={{fontSize: 16}} />收藏</Box> : `收藏 ${stats.favorites}`} />
        </Tabs>
      </Box>

      {tab === "works" && (works && !works.length ?
        <Empty>{self ? "你還沒有公開的作品，上傳並通過審核後就會出現在這裡。" : "還沒有公開的作品。"}</Empty> :
        <ArtworkGrid artworks={works} onChange={replaceIn(setWorks)} />)}
      {tab === "commissions" && <Commissions user={user} self={self} />}
      {tab === "favorites" && (favorites === "private" ? (
        <Empty><LockOutlinedIcon sx={{fontSize: 40, opacity: 0.5, display: "block", mx: "auto", mb: 1}} />{user.displayName} 沒有公開收藏。</Empty>
      ) : favorites && !favorites.length ? (
        <Empty>還沒有收藏任何作品。</Empty>
      ) : (
        <>
          {self && !user.likesPublic && <Box sx={{mb: 2, fontSize: 13, color: "text.secondary"}}><LockOutlinedIcon sx={{fontSize: 14, verticalAlign: "-2px"}} /> 只有你看得到自己的收藏，可以在個人資料中公開。</Box>}
          <ArtworkGrid artworks={favorites} onChange={replaceIn(setFavorites)} />
        </>
      ))}
    </>
  );
};

UserPage.propTypes = {userId: PropTypes.string.isRequired, tab: PropTypes.string};

export default UserPage;
