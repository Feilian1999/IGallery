import * as React from "react";
import PropTypes from "prop-types";
import {useTheme} from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Button from "@mui/material/Button";
import Badge from "@mui/material/Badge";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ChairOutlinedIcon from "@mui/icons-material/ChairOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import ColorModeContext from "../themes/ToggleContext";
import {useSession, isMember, isAdmin} from "../session";

const TOP_BAR = 64;
const WIDE = 232;
const NARROW = 72;
const COLLAPSED_KEY = "igallery:sidebar-collapsed";

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch (error) {
    return false;
  }
};

// Where the "post" button goes depends on who is looking.
const postHref = (session) => (!session ? "#login" : isMember(session) ? "#me/new" : "#me/profile");

/* eslint-disable react/prop-types */

const NavItem = ({icon, label, href, active, collapsed, badge, onClick}) => {
  const content = (
    <Box
      component={href ? "a" : "button"}
      href={href}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      sx={{
        "display": "flex", "alignItems": "center", "gap": 2, "width": "100%", "height": 44, "px": collapsed ? 0 : 2,
        "justifyContent": collapsed ? "center" : "flex-start", "border": 0, "borderRadius": 2, "cursor": "pointer",
        "color": active ? "primary.main" : "text.primary", "bgcolor": active ? "action.selected" : "transparent",
        "fontWeight": active ? 700 : 500, "fontSize": 14, "fontFamily": "inherit", "textDecoration": "none",
        "&:hover": {bgcolor: active ? "action.selected" : "action.hover"},
      }}
    >
      <Badge badgeContent={badge} color="error" max={99} invisible={!badge}>{icon}</Badge>
      {!collapsed && <span>{label}</span>}
    </Box>
  );
  return collapsed ? <Tooltip title={label} placement="right">{content}</Tooltip> : content;
};

const Section = ({title, collapsed, children}) => (
  <Box sx={{mt: 1.5}}>
    {collapsed ? <Divider sx={{my: 1, mx: 1.5}} /> : (
      <Box sx={{px: 2, py: 1, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "text.secondary"}}>{title}</Box>
    )}
    {children}
  </Box>
);

const SideNav = ({page, userId, collapsed, onNavigate}) => {
  const {session} = useSession();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const dark = theme.palette.mode === "dark";
  const item = (props) => <NavItem collapsed={collapsed} {...props} onClick={onNavigate} />;
  return (
    <Box sx={{display: "flex", flexDirection: "column", height: "100%", p: 1.5}}>
      {item({icon: <HomeOutlinedIcon />, label: "首頁", href: "#", active: page === "home"})}
      {item({icon: <ViewInArOutlinedIcon />, label: "3D 畫廊", href: "#gallery"})}
      {item({icon: <EmojiEventsOutlinedIcon />, label: "排行榜", href: "#ranking", active: page === "ranking"})}
      {item({icon: <FavoriteBorderIcon />, label: "喜歡的作品", href: "#likes", active: page === "likes"})}
      {session && (
        <Section title="我的" collapsed={collapsed}>
          {isMember(session) && item({
            icon: <AccountBoxOutlinedIcon />, label: "我的個人頁", href: `#users/${session.user.id}`,
            active: page === "user" && String(session.user.id) === userId,
          })}
          {item({icon: <DashboardOutlinedIcon />, label: "我的作品", href: "#me", active: page === "me"})}
        </Section>
      )}
      {isAdmin(session) && (
        <Section title="管理" collapsed={collapsed}>
          {item({icon: <FactCheckOutlinedIcon />, label: "審核", href: "#admin/review", badge: session.pendingReviews, active: page === "review"})}
          {item({icon: <CollectionsOutlinedIcon />, label: "所有作品", href: "#admin/artworks", active: page === "artworks"})}
          {item({icon: <ChairOutlinedIcon />, label: "展場配置", href: "#admin/exhibition", active: page === "exhibition"})}
          {item({icon: <GroupOutlinedIcon />, label: "使用者", href: "#admin/users", active: page === "users"})}
        </Section>
      )}
      <Box sx={{flex: 1}} />
      <NavItem
        collapsed={collapsed}
        icon={dark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        label={dark ? "淺色模式" : "深色模式"}
        onClick={colorMode.toggleColorMode}
      />
    </Box>
  );
};

const TopBar = ({query, onMenu}) => {
  const {session, logout} = useSession();
  const [search, setSearch] = React.useState(query || "");
  const [menu, setMenu] = React.useState(null);
  const compact = useMediaQuery((theme) => theme.breakpoints.down("sm"));

  React.useEffect(() => setSearch(query || ""), [query]);

  const submit = (event) => {
    event.preventDefault();
    const text = search.trim();
    window.location.hash = text ? `#search/${encodeURIComponent(text)}` : "#";
  };

  return (
    <Box component="header" sx={{
      position: "sticky", top: 0, zIndex: (theme) => theme.zIndex.appBar, height: TOP_BAR,
      display: "flex", alignItems: "center", gap: {xs: 1, sm: 2}, px: {xs: 1, sm: 2},
      bgcolor: "background.default", borderBottom: 1, borderColor: "divider",
    }}>
      <IconButton onClick={onMenu} aria-label="選單"><MenuIcon /></IconButton>
      <Box component="a" href="#" sx={{fontFamily: "\"Noto Serif TC\", serif", fontWeight: 700, fontSize: 20, color: "text.primary", textDecoration: "none", display: {xs: "none", sm: "block"}}}>
        IGallery
      </Box>

      <Box component="form" onSubmit={submit} sx={{
        "flex": 1, "maxWidth": 560, "mx": "auto", "display": "flex", "alignItems": "center", "gap": 1, "height": 40, "px": 2,
        "borderRadius": 20, "bgcolor": "action.hover", "&:focus-within": {bgcolor: "background.paper", boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`},
      }}>
        <SearchIcon fontSize="small" sx={{color: "text.secondary"}} />
        <InputBase value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋作品、作者、角色" sx={{flex: 1, fontSize: 14}} inputProps={{"aria-label": "搜尋"}} />
      </Box>

      <Box sx={{display: "flex", alignItems: "center", gap: {xs: 0, sm: 1}}}>
        {compact ? (
          <IconButton href={postHref(session)} color="primary" aria-label="發布作品"><AddPhotoAlternateOutlinedIcon /></IconButton>
        ) : (
          <Button href={postHref(session)} variant="contained" disableElevation startIcon={<AddPhotoAlternateOutlinedIcon />} sx={{borderRadius: 20, px: 2}}>
            發布作品
          </Button>
        )}
        <Tooltip title="收信">
          <IconButton href={session ? "#inbox" : "#login"} aria-label="收信"><MailOutlineIcon /></IconButton>
        </Tooltip>
        <Tooltip title="通知">
          <IconButton href={session ? "#me/notifications" : "#login"} aria-label="通知">
            <Badge badgeContent={session?.unreadNotifications} color="error" max={99}><NotificationsNoneIcon /></Badge>
          </IconButton>
        </Tooltip>
        {session === null && <Button href="#login" variant="outlined" sx={{borderRadius: 20}}>登入</Button>}
        {session && (
          <>
            <IconButton onClick={(event) => setMenu(event.currentTarget)} aria-label="個人選單" sx={{p: 0.5}}>
              <Avatar sx={{width: 34, height: 34, bgcolor: "primary.main", fontSize: 15}}>{session.user.displayName.slice(0, 1)}</Avatar>
            </IconButton>
            <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{vertical: "bottom", horizontal: "right"}} transformOrigin={{vertical: "top", horizontal: "right"}}>
              <Box sx={{px: 2, py: 1.5, minWidth: 220}}>
                <Box sx={{fontWeight: 700}}>{session.user.displayName}</Box>
                <Box sx={{fontSize: 12, color: "text.secondary"}}>@{session.user.username}{session.user.role === "guest" ? " · 訪客" : ""}</Box>
              </Box>
              <Divider />
              {isMember(session) && (
                <MenuItem component="a" href={`#users/${session.user.id}`} onClick={() => setMenu(null)}><ListItemIcon><AccountBoxOutlinedIcon fontSize="small" /></ListItemIcon>我的個人頁</MenuItem>
              )}
              <MenuItem component="a" href="#me" onClick={() => setMenu(null)}><ListItemIcon><DashboardOutlinedIcon fontSize="small" /></ListItemIcon>我的作品</MenuItem>
              <MenuItem component="a" href="#me/profile" onClick={() => setMenu(null)}><ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>編輯個人資料</MenuItem>
              <MenuItem component="a" href="#likes" onClick={() => setMenu(null)}><ListItemIcon><FavoriteBorderIcon fontSize="small" /></ListItemIcon>喜歡的作品</MenuItem>
              <Divider />
              <MenuItem onClick={() => {
                setMenu(null);
                logout();
              }}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>登出</MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );
};

// Public pages: a slim top bar for posting, search, inbox, notifications and the
// account menu, and a sidebar with everything else.
const AppShell = ({page, userId, query, children}) => {
  const desktop = useMediaQuery((theme) => theme.breakpoints.up("md"));
  const [collapsed, setCollapsed] = React.useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggle = () => {
    if (!desktop) {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch (error) {
        // remembering the choice is a nicety
      }
      return !value;
    });
  };

  const width = collapsed ? NARROW : WIDE;

  return (
    <Box sx={{minHeight: "100vh", bgcolor: "background.default", color: "text.primary"}}>
      <TopBar query={query} onMenu={toggle} />
      {desktop ? (
        <Box component="nav" sx={{
          position: "fixed", top: TOP_BAR, bottom: 0, left: 0, width, overflowY: "auto", overflowX: "hidden",
          borderRight: 1, borderColor: "divider", bgcolor: "background.default", transition: "width 0.2s ease",
        }}>
          <SideNav page={page} userId={userId} collapsed={collapsed} />
        </Box>
      ) : (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{sx: {width: WIDE, bgcolor: "background.default"}}}>
          <Box sx={{height: TOP_BAR, display: "flex", alignItems: "center", px: 3, fontFamily: "\"Noto Serif TC\", serif", fontWeight: 700, fontSize: 20}}>IGallery</Box>
          <SideNav page={page} userId={userId} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}
      <Box component="main" sx={{ml: desktop ? `${width}px` : 0, transition: "margin-left 0.2s ease"}}>
        <Box sx={{maxWidth: 1360, mx: "auto", px: {xs: 2, sm: 3, md: 4}, py: 3}}>{children}</Box>
      </Box>
    </Box>
  );
};

AppShell.propTypes = {
  page: PropTypes.string.isRequired,
  userId: PropTypes.string,
  query: PropTypes.string,
  children: PropTypes.node,
};

export default AppShell;
