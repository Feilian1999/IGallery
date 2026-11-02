import * as React from "react";
import PropTypes from "prop-types";
import {api} from "./api";

const POLL_MS = 60 * 1000;

// Who is signed in, shared by the home page, the gallery and the studio.
// session: undefined while loading, null when signed out, else the /api/auth/me response.
const SessionContext = React.createContext({session: null, refresh: async () => {}, logout: async () => {}});

export const SessionProvider = ({children}) => {
  const [session, setSession] = React.useState(undefined);

  const refresh = React.useCallback(async () => {
    try {
      setSession(await api("/auth/me"));
    } catch (error) {
      setSession(null);
    }
  }, []);

  const logout = React.useCallback(async () => {
    await api("/auth/logout", {method: "POST"}).catch(() => {});
    window.location.hash = "";
    setSession(null);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // keep the notification badge current: poll while the page is visible, and check
  // again as soon as the visitor comes back to the tab
  const setUnread = React.useCallback((unread) => {
    setSession((current) => (current && current.unreadNotifications !== unread ? {...current, unreadNotifications: unread} : current));
  }, []);
  const signedIn = Boolean(session);
  React.useEffect(() => {
    if (!signedIn) return undefined;
    const check = () => {
      if (document.hidden) return;
      api("/me/notifications/unread").then((data) => setUnread(data.unread)).catch(() => {});
    };
    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [signedIn, setUnread]);

  const value = React.useMemo(() => ({session, refresh, logout, setUnread}), [session, refresh, logout, setUnread]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

SessionProvider.propTypes = {children: PropTypes.node};

export const useSession = () => React.useContext(SessionContext);

export const isMember = (session) => Boolean(session && session.user.role !== "guest");
export const isAdmin = (session) => session?.user.role === "admin";
// artists (and admins) publish work; members apply to become one
export const isArtist = (session) => session?.user.role === "artist" || isAdmin(session);

// Likes go to published artworks by other members.
export const toggleLike = (artwork) => api(`/artworks/${artwork.id}/like`, {method: artwork.liked ? "DELETE" : "POST"});
