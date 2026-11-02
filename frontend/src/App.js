import * as React from "react";
import "./App.css";
import {ThemeProvider, createTheme} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import ColorModeContext from "./themes/ToggleContext";
import {SessionProvider} from "./session";
import AppShell from "./layout/AppShell";
import HomePage from "./pages/HomePage";
import RankingPage from "./pages/RankingPage";
import LikesPage from "./pages/LikesPage";
import InboxPage from "./pages/InboxPage";
import UserPage from "./pages/UserPage";

// three.js and the whole 3D gallery are only downloaded when someone opens it
const GalleryPage = React.lazy(() => import("./pages/GalleryPage"));
const StudioApp = React.lazy(() => import("./studio/StudioApp"));
const ProfileDialog = React.lazy(() => import("./studio/ProfileDialog"));

// #me/profile opens a dialog over the current page instead of replacing it
const PROFILE = /^#\/?me\/profile\/?$/;

const MODE_KEY = "igallery:color-mode";

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {main: mode === "light" ? "#6750A4" : "#b9a7f0", contrastText: mode === "light" ? "#ffffff" : "#1c1530"},
    secondary: {main: "#625B71"},
    ...(mode === "light" ?
      {background: {default: "#ffffff", paper: "#ffffff"}, divider: "rgba(0, 0, 0, 0.08)"} :
      {background: {default: "#121214", paper: "#1b1b1f"}, divider: "rgba(255, 255, 255, 0.1)"}),
  },
  shape: {borderRadius: 8},
  typography: {
    fontFamily: "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", system-ui, sans-serif",
    button: {textTransform: "none", fontWeight: 700},
  },
});

const readMode = () => {
  try {
    return window.localStorage.getItem(MODE_KEY) || "dark";
  } catch (error) {
    return "dark";
  }
};

// Pages are picked from the URL hash. Everything except the 3D gallery sits inside
// the shell; `nav` is the sidebar item to highlight.
//   (empty) / #            home
//   #search/<text>         search results
//   #ranking, #likes, #inbox
//   #users/<id>[/<tab>]    an artist's public page: works, commissions or favorites
//   #login, #me…, #admin…  the studio
//   #me/profile            profile dialog over the previous page
//   #gallery               the 3D gallery (full screen)
const STUDIO_NAV = {
  "login": "login", "me": "me", "me/notifications": "notifications", "me/artwork": "me", "me/new": "me",
  "admin": "review", "admin/review": "review", "admin/artworks": "artworks", "admin/exhibition": "exhibition", "admin/users": "users",
};

const decode = (text) => {
  try {
    return decodeURIComponent(text);
  } catch (error) {
    return text;
  }
};

const parseHash = (hash) => {
  if (hash === "#gallery") return {page: "gallery"};
  const [name, ...rest] = hash.replace(/^#\/?/, "").split("/");
  if (["login", "me", "admin"].includes(name)) {
    return {page: "studio", nav: STUDIO_NAV[rest[0] ? `${name}/${rest[0]}` : name] || name};
  }
  if (name === "users" && rest[0]) return {page: "user", nav: "user", userId: rest[0], tab: rest[1]};
  if (name === "search") return {page: "home", nav: "home", query: decode(rest.join("/"))};
  if (["ranking", "likes", "inbox"].includes(name)) return {page: name, nav: name};
  return {page: "home", nav: "home"};
};

const SHELL_PAGES = {home: HomePage, ranking: RankingPage, likes: LikesPage, inbox: InboxPage, user: UserPage};

/**
 * @return {App} App object
 */
const App = () => {
  const [mode, setMode] = React.useState(readMode);
  const colorMode = React.useMemo(() => ({
    toggleColorMode: () => setMode((previous) => {
      const next = previous === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(MODE_KEY, next);
      } catch (error) {
        // remembering the choice is a nicety
      }
      return next;
    }),
  }), []);
  const theme = React.useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  const [hash, setHash] = React.useState(window.location.hash);
  // the page shown behind the profile dialog; home when the dialog is opened directly
  const [background, setBackground] = React.useState(() => (PROFILE.test(window.location.hash) ? "" : window.location.hash));
  React.useEffect(() => {
    const handleHashChange = (event) => {
      const next = window.location.hash;
      setHash(next);
      if (PROFILE.test(next)) return;
      setBackground(next);
      // closing the dialog returns to the same scroll position
      if (!PROFILE.test(new URL(event.oldURL).hash)) window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  const profileOpen = PROFILE.test(hash);
  const pageHash = profileOpen ? background : hash;
  const route = parseHash(pageHash);
  // kept mounted after the first open so the dialog can animate closed
  const [profileUsed, setProfileUsed] = React.useState(profileOpen);
  if (profileOpen && !profileUsed) setProfileUsed(true);
  const ShellPage = SHELL_PAGES[route.page];

  return (
    <SessionProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="App">
            {route.page === "gallery" ? (
              // the gallery is full screen with its own controls
              <React.Suspense fallback={<div style={{position: "fixed", inset: 0, background: "#050505"}} />}>
                <GalleryPage />
              </React.Suspense>
            ) : (
              <AppShell page={route.nav} userId={route.userId} query={route.query}>
                {ShellPage ? <ShellPage query={route.query} userId={route.userId} tab={route.tab} key={route.userId} /> : (
                  <React.Suspense fallback={null}>
                    <StudioApp hash={pageHash} />
                  </React.Suspense>
                )}
              </AppShell>
            )}
            {profileUsed && (
              <React.Suspense fallback={null}>
                <ProfileDialog open={profileOpen} onClose={() => {
                  window.location.hash = background || "#";
                }} />
              </React.Suspense>
            )}
          </div>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </SessionProvider>
  );
};

export default App;
