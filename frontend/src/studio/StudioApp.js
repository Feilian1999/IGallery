import * as React from "react";
import {useTheme} from "@mui/material/styles";
import {useSession, isMember, isAdmin} from "../session";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import ProfilePage from "./ProfilePage";
import ArtworkEditor from "./ArtworkEditor";
import ReviewQueue from "./ReviewQueue";
import AllArtworks from "./AllArtworks";
import ExhibitionEditor from "./ExhibitionEditor";
import UsersPage from "./UsersPage";
import NotificationsPage from "./NotificationsPage";
import "./admin.css";

// The studio pages, shown inside the site shell (top bar and sidebar come from AppShell).
//   #login                 sign in, sign up, or continue as a guest
//   #me                    dashboard: stats, upload, my artworks
//   #me/profile            profile, favorites privacy, commissions, password
//   #me/notifications      notification list
//   #me/artwork/<id>       edit one artwork
//   #admin/review | artworks | exhibition | users   (admin)
export const parseStudioRoute = (hash) => {
  const [area, page, id] = hash.replace(/^#\/?/, "").split("/");
  if (area === "login") return {page: "login"};
  if (area === "admin") return {page: ["artworks", "exhibition", "users"].includes(page) ? page : "review", admin: true};
  if (page === "profile") return {page: "profile"};
  if (page === "notifications") return {page: "notifications"};
  if (page === "artwork" && id) return {page: "edit", id: decodeURIComponent(id)};
  return {page: "dashboard"};
};

const StudioApp = () => {
  const {session} = useSession();
  const theme = useTheme();
  const [route, setRoute] = React.useState(() => parseStudioRoute(window.location.hash));

  React.useEffect(() => {
    const onHashChange = () => setRoute(parseStudioRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // signed-in users skip the login page
  React.useEffect(() => {
    if (session && route.page === "login") window.location.hash = "#me";
  }, [session, route.page]);

  let content;
  if (session === undefined) {
    content = <div className="admin--center"><div className="admin-spinner" /></div>;
  } else if (!session || route.page === "login") {
    content = <LoginPage />;
  } else if (route.admin && !isAdmin(session)) {
    content = (
      <div className="admin--center">
        <div className="admin-login">
          <h1 className="admin-login__title">只有管理者可以進入</h1>
          <a className="admin-link" href="#me">← 回到我的作品</a>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {!isMember(session) && (
          <div className="admin-notice">
            你正在以訪客身分瀏覽。<a className="admin-link" href="#me/profile">註冊成為會員</a>就能上傳作品、對喜歡的作品按讚。
          </div>
        )}
        {route.page === "dashboard" && <Dashboard />}
        {route.page === "profile" && <ProfilePage />}
        {route.page === "notifications" && <NotificationsPage />}
        {route.page === "edit" && <ArtworkEditor key={route.id} id={route.id} />}
        {route.page === "review" && <ReviewQueue />}
        {route.page === "artworks" && <AllArtworks />}
        {route.page === "exhibition" && <ExhibitionEditor />}
        {route.page === "users" && <UsersPage />}
      </>
    );
  }

  return <div className="admin" data-mode={theme.palette.mode}>{content}</div>;
};

export default StudioApp;
