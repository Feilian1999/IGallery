/* eslint-disable react/prop-types */
import * as React from "react";
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

// #login                 sign in, sign up, or continue as a guest
// #me                    dashboard: stats, upload, my artworks
// #me/profile            display name, bio, password (guests: become a member)
// #me/notifications      notification list
// #me/artwork/<id>       edit one artwork
// #admin/review          review queue          (admin)
// #admin/artworks        every artwork, order  (admin)
// #admin/exhibition      hang artworks         (admin)
// #admin/users           accounts              (admin)
const parseRoute = () => {
  const [area, page, id] = window.location.hash.replace(/^#\/?/, "").split("/");
  if (area === "login") return {page: "login"};
  if (area === "admin") return {page: ["artworks", "exhibition", "users"].includes(page) ? page : "review", admin: true};
  if (page === "profile") return {page: "profile"};
  if (page === "notifications") return {page: "notifications"};
  if (page === "artwork" && id) return {page: "edit", id: decodeURIComponent(id)};
  return {page: "dashboard"};
};

const NavLink = ({href, active, children}) => (
  <a className={`admin-tab${active ? " admin-tab--active" : ""}`} href={href}>{children}</a>
);


const StudioApp = () => {
  const {session, logout} = useSession();
  const [route, setRoute] = React.useState(parseRoute);

  React.useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // signed-in users skip the login page; signed-out users only see it
  React.useEffect(() => {
    if (session && route.page === "login") window.location.hash = "#me";
  }, [session, route.page]);

  if (session === undefined) return <div className="admin admin--center"><div className="admin-spinner" /></div>;
  if (!session || route.page === "login") return <LoginPage />;

  const admin = isAdmin(session);
  if (route.admin && !admin) {
    return (
      <div className="admin admin--center">
        <div className="admin-login">
          <h1 className="admin-login__title">只有管理者可以進入</h1>
          <a className="admin-link" href="#me">← 回到我的作品</a>
        </div>
      </div>
    );
  }

  const signOut = async () => {
    await logout();
    window.location.hash = "";
  };

  return (
    <div className="admin">
      <header className="admin-bar">
        <a className="admin-bar__brand" href="#me">
          <span className="admin-eyebrow">Studio</span>
          IGallery 工作室
        </a>
        <nav className="admin-tabs">
          <NavLink href="#me" active={route.page === "dashboard" || route.page === "edit"}>總覽</NavLink>
          <NavLink href="#me/profile" active={route.page === "profile"}>個人資料</NavLink>
          {admin && (
            <>
              <span className="admin-tabs__divider" />
              <NavLink href="#admin/review" active={route.page === "review"}>
                審核{session.pendingReviews > 0 && <span className="admin-count">{session.pendingReviews}</span>}
              </NavLink>
              <NavLink href="#admin/artworks" active={route.page === "artworks"}>所有作品</NavLink>
              <NavLink href="#admin/exhibition" active={route.page === "exhibition"}>展場配置</NavLink>
              <NavLink href="#admin/users" active={route.page === "users"}>使用者</NavLink>
            </>
          )}
        </nav>
        <div className="admin-bar__end">
          {session.storage === "local" && <span className="admin-badge" title="尚未設定 Vercel Blob，圖片存在本機">本機開發</span>}
          <a className={`admin-bell${route.page === "notifications" ? " admin-bell--active" : ""}`} href="#me/notifications" aria-label="通知" title="通知">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Zm-2 1H7v-6a5 5 0 0 1 10 0v6Z" />
            </svg>
            {session.unreadNotifications > 0 && <span className="admin-bell__count">{session.unreadNotifications > 99 ? "99+" : session.unreadNotifications}</span>}
          </a>
          <a className="admin-link" href="#">首頁</a>
          <a className="admin-link" href="#gallery">看畫廊 ↗</a>
          <span className="admin-user">
            <span className="admin-avatar">{session.user.displayName.slice(0, 1)}</span>
            {session.user.displayName}
            {session.user.role !== "member" && <em>{admin ? "管理者" : "訪客"}</em>}
          </span>
          <button className="admin-button admin-button--ghost" onClick={signOut}>登出</button>
        </div>
      </header>
      {!isMember(session) && (
        <div className="admin-notice">
          你正在以訪客身分瀏覽。<a className="admin-link" href="#me/profile">註冊成為會員</a>就能上傳作品、對喜歡的作品按讚。
        </div>
      )}
      <main className="admin-main">
        {route.page === "dashboard" && <Dashboard />}
        {route.page === "profile" && <ProfilePage />}
        {route.page === "notifications" && <NotificationsPage />}
        {route.page === "edit" && <ArtworkEditor key={route.id} id={route.id} />}
        {route.page === "review" && <ReviewQueue />}
        {route.page === "artworks" && <AllArtworks />}
        {route.page === "exhibition" && <ExhibitionEditor />}
        {route.page === "users" && <UsersPage />}
      </main>
    </div>
  );
};

export default StudioApp;
