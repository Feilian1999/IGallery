import * as React from "react";
import PropTypes from "prop-types";
import {useTheme} from "@mui/material/styles";
import {useSession, isMember, isAdmin, isArtist} from "../session";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import ArtworkEditor from "./ArtworkEditor";
import ReviewQueue from "./ReviewQueue";
import AllArtworks from "./AllArtworks";
import ExhibitionEditor from "./ExhibitionEditor";
import UsersPage from "./UsersPage";
import NotificationsPage from "./NotificationsPage";
import ArtistApplication from "./ArtistApplication";
import ArtistApplications from "./ArtistApplications";
import "./admin.css";

// The studio pages, shown inside the site shell (top bar and sidebar come from AppShell).
//   #login                 sign in, sign up, or continue as a guest
//   #me                    dashboard: stats, upload, my artworks
//   #me/notifications      notification list
//   #me/apply              apply to become an artist (where members land instead of the dashboard)
//   #me/new                publish a new artwork (the editor, before it exists)
//   #me/artwork/<id>       edit one artwork
//   #admin/review | applications | artworks | exhibition | users   (admin)
export const parseStudioRoute = (hash) => {
  const [area, page, id] = hash.replace(/^#\/?/, "").split("/");
  if (area === "login") return {page: "login"};
  if (area === "admin") return {page: ["applications", "artworks", "exhibition", "users"].includes(page) ? page : "review", admin: true};
  if (page === "apply") return {page: "apply"};
  if (page === "notifications") return {page: "notifications"};
  if (page === "new") return {page: "new"};
  if (page === "artwork" && id) return {page: "edit", id: decodeURIComponent(id)};
  return {page: "dashboard"};
};

// `hash` is the page under any open dialog (App keeps it while #me/profile is showing).
const StudioApp = ({hash}) => {
  const {session} = useSession();
  const theme = useTheme();
  const route = parseStudioRoute(hash);

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
            你正在以訪客身分瀏覽。<a className="admin-link" href="#me/profile">註冊成為會員</a>就能對喜歡的作品按讚收藏，也可以申請成為藝術家發布作品。
          </div>
        )}
        {route.page === "dashboard" && isArtist(session) && <Dashboard />}
        {route.page === "notifications" && <NotificationsPage />}
        {/* only artists publish; everyone else gets the way to become one */}
        {(route.page === "apply" || (!isArtist(session) && ["dashboard", "new", "edit"].includes(route.page))) && <ArtistApplication />}
        {route.page === "new" && isArtist(session) && <ArtworkEditor />}
        {route.page === "edit" && isArtist(session) && <ArtworkEditor key={route.id} id={route.id} />}
        {route.page === "review" && <ReviewQueue />}
        {route.page === "applications" && <ArtistApplications />}
        {route.page === "artworks" && <AllArtworks />}
        {route.page === "exhibition" && <ExhibitionEditor />}
        {route.page === "users" && <UsersPage />}
      </>
    );
  }

  return <div className="admin" data-mode={theme.palette.mode}>{content}</div>;
};

StudioApp.propTypes = {hash: PropTypes.string.isRequired};

export default StudioApp;
