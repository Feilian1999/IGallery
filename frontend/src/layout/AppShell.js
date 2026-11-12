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
import BrushOutlinedIcon from "@mui/icons-material/BrushOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ChairOutlinedIcon from "@mui/icons-material/ChairOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBoxOutlinedIcon from "@mui/icons-material/AccountBoxOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import TranslateIcon from "@mui/icons-material/Translate";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {useTranslation} from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ColorModeContext from "../themes/ToggleContext";
import {useSession, isMember, isAdmin, isArtist} from "../session";

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

// Where the "post" button goes depends on who is looking: artists publish, members apply
// to become one, guests register first.
const postHref = (session) => {
  if (!session) return "#login";
  if (isArtist(session)) return "#me/new";
  return isMember(session) ? "#me/apply" : "#me/profile";
};

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

// The interface language, as a native <select> dressed like a NavItem; collapsed it
// shows only the short labels.
const LanguageItem = ({collapsed}) => {
  const {t} = useTranslation();
  const content = (
    <Box sx={{
      "position": "relative", "display": "flex", "alignItems": "center", "height": 44, "px": collapsed ? 0 : 2,
      "justifyContent": collapsed ? "center" : "flex-start", "borderRadius": 2, "color": "text.primary",
      "&:hover": {bgcolor: "action.hover"}, "&:focus-within": {bgcolor: "action.hover"},
    }}>
      {!collapsed && <TranslateIcon sx={{pointerEvents: "none"}} />}
      <Box
        component={LanguageSwitcher}
        short={collapsed}
        sx={{
          "position": "absolute", "inset": 0, "width": "100%", "height": "100%", "m": 0, "border": 0, "borderRadius": 2,
          "pl": collapsed ? 0 : "56px", "pr": collapsed ? 0 : 5, "appearance": "none", "bgcolor": "transparent", "color": "inherit",
          "fontFamily": "inherit", "fontSize": 14, "fontWeight": 500, "cursor": "pointer", "outline": 0,
          "textAlign": collapsed ? "center" : "left", "textAlignLast": collapsed ? "center" : "left",
          "&:focus-visible": {boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`},
          "& option": {color: "text.primary", bgcolor: "background.paper"},
        }}
      />
      {!collapsed && <ExpandMoreIcon fontSize="small" sx={{position: "absolute", right: 12, color: "text.secondary", pointerEvents: "none"}} />}
    </Box>
  );
  return collapsed ? <Tooltip title={t("language")} placement="right">{content}</Tooltip> : content;
};

const SideNav = ({page, userId, collapsed, onNavigate}) => {
  const {t} = useTranslation("site");
  const {session} = useSession();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);
  const dark = theme.palette.mode === "dark";
  const item = (props) => <NavItem collapsed={collapsed} {...props} onClick={onNavigate} />;
  return (
    <Box sx={{display: "flex", flexDirection: "column", height: "100%", p: 1.5}}>
      {item({icon: <HomeOutlinedIcon />, label: t("nav.home"), href: "#", active: page === "home"})}
      {item({icon: <ViewInArOutlinedIcon />, label: t("nav.gallery"), href: "#gallery"})}
      {item({icon: <EmojiEventsOutlinedIcon />, label: t("nav.ranking"), href: "#ranking", active: page === "ranking"})}
      {item({icon: <FavoriteBorderIcon />, label: t("nav.likes"), href: "#likes", active: page === "likes"})}
      {session && (
        <Section title={t("nav.mine")} collapsed={collapsed}>
          {isMember(session) && item({
            icon: <AccountBoxOutlinedIcon />, label: t("nav.myPage"), href: `#users/${session.user.id}`,
            active: page === "user" && String(session.user.id) === userId,
          })}
          {isArtist(session) ?
            item({icon: <DashboardOutlinedIcon />, label: t("nav.myWorks"), href: "#me", active: page === "me"}) :
            item({icon: <BrushOutlinedIcon />, label: t("nav.becomeArtist"), href: "#me/apply", active: page === "apply" || page === "me"})}
        </Section>
      )}
      {isAdmin(session) && (
        <Section title={t("nav.admin")} collapsed={collapsed}>
          {item({icon: <FactCheckOutlinedIcon />, label: t("nav.review"), href: "#admin/review", badge: session.pendingReviews, active: page === "review"})}
          {item({icon: <HowToRegOutlinedIcon />, label: t("nav.applications"), href: "#admin/applications", badge: session.pendingApplications, active: page === "applications"})}
          {item({icon: <CollectionsOutlinedIcon />, label: t("nav.allArtworks"), href: "#admin/artworks", active: page === "artworks"})}
          {item({icon: <ChairOutlinedIcon />, label: t("nav.exhibition"), href: "#admin/exhibition", active: page === "exhibition"})}
          {item({icon: <GroupOutlinedIcon />, label: t("nav.users"), href: "#admin/users", active: page === "users"})}
        </Section>
      )}
      <Box sx={{flex: 1}} />
      <LanguageItem collapsed={collapsed} />
      <NavItem
        collapsed={collapsed}
        icon={dark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        label={dark ? t("nav.lightMode") : t("nav.darkMode")}
        onClick={colorMode.toggleColorMode}
      />
    </Box>
  );
};

const TopBar = ({query, onMenu}) => {
  const {t} = useTranslation("site");
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
      <IconButton onClick={onMenu} aria-label={t("top.menu")}><MenuIcon /></IconButton>
      <Box component="a" href="#" sx={{fontFamily: "\"Noto Serif TC\", serif", fontWeight: 700, fontSize: 20, color: "text.primary", textDecoration: "none", display: {xs: "none", sm: "block"}}}>
        IGallery
      </Box>

      <Box component="form" onSubmit={submit} sx={{
        "flex": 1, "maxWidth": 560, "mx": "auto", "display": "flex", "alignItems": "center", "gap": 1, "height": 40, "px": 2,
        "borderRadius": 20, "bgcolor": "action.hover", "&:focus-within": {bgcolor: "background.paper", boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`},
      }}>
        <SearchIcon fontSize="small" sx={{color: "text.secondary"}} />
        <InputBase value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("top.searchPlaceholder")} sx={{flex: 1, fontSize: 14}} inputProps={{"aria-label": t("top.search")}} />
      </Box>

      <Box sx={{display: "flex", alignItems: "center", gap: {xs: 0, sm: 1}}}>
        {compact ? (
          <IconButton href={postHref(session)} color="primary" aria-label={t("top.post")}><AddPhotoAlternateOutlinedIcon /></IconButton>
        ) : (
          <Button href={postHref(session)} variant="contained" disableElevation startIcon={<AddPhotoAlternateOutlinedIcon />} sx={{borderRadius: 20, px: 2}}>
            {t("top.post")}
          </Button>
        )}
        <Tooltip title={t("top.inbox")}>
          <IconButton href={session ? "#inbox" : "#login"} aria-label={t("top.inbox")}><MailOutlineIcon /></IconButton>
        </Tooltip>
        <Tooltip title={t("top.notifications")}>
          <IconButton href={session ? "#me/notifications" : "#login"} aria-label={t("top.notifications")}>
            <Badge badgeContent={session?.unreadNotifications} color="error" max={99}><NotificationsNoneIcon /></Badge>
          </IconButton>
        </Tooltip>
        {session === null && <Button href="#login" variant="outlined" sx={{borderRadius: 20}}>{t("top.login")}</Button>}
        {session && (
          <>
            <IconButton onClick={(event) => setMenu(event.currentTarget)} aria-label={t("top.accountMenu")} sx={{p: 0.5}}>
              <Avatar sx={{width: 34, height: 34, bgcolor: "primary.main", fontSize: 15}}>{session.user.displayName.slice(0, 1)}</Avatar>
            </IconButton>
            <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)} anchorOrigin={{vertical: "bottom", horizontal: "right"}} transformOrigin={{vertical: "top", horizontal: "right"}}>
              <Box sx={{px: 2, py: 1.5, minWidth: 220}}>
                <Box sx={{fontWeight: 700}}>{session.user.displayName}</Box>
                <Box sx={{fontSize: 12, color: "text.secondary"}}>@{session.user.username}{session.user.role === "guest" ? ` · ${t("common:roles.guest")}` : ""}</Box>
              </Box>
              <Divider />
              {isMember(session) && (
                <MenuItem component="a" href={`#users/${session.user.id}`} onClick={() => setMenu(null)}><ListItemIcon><AccountBoxOutlinedIcon fontSize="small" /></ListItemIcon>{t("nav.myPage")}</MenuItem>
              )}
              {isArtist(session) ? (
                <MenuItem component="a" href="#me" onClick={() => setMenu(null)}><ListItemIcon><DashboardOutlinedIcon fontSize="small" /></ListItemIcon>{t("nav.myWorks")}</MenuItem>
              ) : isMember(session) && (
                <MenuItem component="a" href="#me/apply" onClick={() => setMenu(null)}><ListItemIcon><BrushOutlinedIcon fontSize="small" /></ListItemIcon>{t("nav.becomeArtist")}</MenuItem>
              )}
              <MenuItem component="a" href="#me/profile" onClick={() => setMenu(null)}><ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>{t("top.editProfile")}</MenuItem>
              {isArtist(session) && (
                <MenuItem component="a" href="#me/commissions" onClick={() => setMenu(null)}><ListItemIcon><BrushOutlinedIcon fontSize="small" /></ListItemIcon>{t("top.commissionSettings")}</MenuItem>
              )}
              <MenuItem component="a" href="#likes" onClick={() => setMenu(null)}><ListItemIcon><FavoriteBorderIcon fontSize="small" /></ListItemIcon>{t("nav.likes")}</MenuItem>
              <Divider />
              <MenuItem onClick={() => {
                setMenu(null);
                logout();
              }}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>{t("top.logout")}</MenuItem>
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
