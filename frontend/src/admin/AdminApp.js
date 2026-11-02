import * as React from "react";
import {api} from "./api";
import LoginPage from "./LoginPage";
import ArtworkList from "./ArtworkList";
import ArtworkEditor from "./ArtworkEditor";
import ExhibitionEditor from "./ExhibitionEditor";
import "./admin.css";

// #admin                 -> artwork list
// #admin/artwork/<id>    -> edit one artwork
// #admin/exhibition      -> hang artworks in the main hall
const parseRoute = () => {
  const [, page, id] = window.location.hash.replace(/^#\/?/, "").split("/");
  if (page === "artwork" && id) return {page: "edit", id: decodeURIComponent(id)};
  if (page === "exhibition") return {page: "exhibition"};
  return {page: "list"};
};

const AdminApp = () => {
  // undefined while checking, null when signed out
  const [session, setSession] = React.useState(undefined);
  const [route, setRoute] = React.useState(parseRoute);

  React.useEffect(() => {
    api("/auth/me").then(setSession).catch(() => setSession(null));
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (session === undefined) return <div className="admin admin--center"><div className="admin-spinner" /></div>;
  if (!session) {
    return <LoginPage onLogin={() => api("/auth/me").then(setSession)} />;
  }

  const logout = async () => {
    await api("/auth/logout", {method: "POST"});
    setSession(null);
  };

  return (
    <div className="admin">
      <header className="admin-bar">
        <a className="admin-bar__brand" href="#admin">
          <span className="admin-eyebrow">Studio</span>
          IGallery 管理
        </a>
        <nav className="admin-tabs">
          <a className={`admin-tab${route.page !== "exhibition" ? " admin-tab--active" : ""}`} href="#admin">作品</a>
          <a className={`admin-tab${route.page === "exhibition" ? " admin-tab--active" : ""}`} href="#admin/exhibition">展場配置</a>
        </nav>
        <div className="admin-bar__end">
          {session.storage === "local" && <span className="admin-badge" title="尚未設定 Vercel Blob，圖片存在本機">本機開發</span>}
          <a className="admin-link" href="#gallery">看畫廊 ↗</a>
          <span className="admin-muted">{session.user.username}</span>
          <button className="admin-button admin-button--ghost" onClick={logout}>登出</button>
        </div>
      </header>
      <main className="admin-main">
        {route.page === "list" && <ArtworkList session={session} />}
        {route.page === "edit" && <ArtworkEditor key={route.id} id={route.id} />}
        {route.page === "exhibition" && <ExhibitionEditor />}
      </main>
    </div>
  );
};

export default AdminApp;
