import * as React from "react";
import {api} from "../api";
import {useSession, isMember} from "../session";
import ArtworkGrid, {Uploader, STATUS} from "./ArtworkGrid";

const FILTERS = ["all", "draft", "pending", "published", "rejected"];

// The signed-in user's home in the studio: numbers, upload, and their own artworks.
const Dashboard = () => {
  const {session} = useSession();
  const [artworks, setArtworks] = React.useState(null);
  const [stats, setStats] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState("");
  const member = isMember(session);

  const loadStats = React.useCallback(() => api("/me/dashboard").then((data) => setStats(data.stats)), []);

  React.useEffect(() => {
    Promise.all([api("/me/artworks"), loadStats()])
        .then(([mine]) => setArtworks(mine.artworks))
        .catch((failure) => setError(failure.message));
  }, [loadStats]);

  const replace = (updated) => {
    setArtworks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    loadStats();
  };
  const shown = (artworks || []).filter((artwork) => filter === "all" || artwork.status === filter);
  const count = (status) => (artworks || []).filter((artwork) => status === "all" || artwork.status === status).length;

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Dashboard</div>
          <h1 className="admin-title">嗨，{session.user.displayName}</h1>
        </div>
      </div>

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat"><strong>{stats.published}</strong><span>已公開</span></div>
          <div className="admin-stat"><strong>{stats.pending}</strong><span>審核中</span></div>
          <div className="admin-stat"><strong>{stats.draft}</strong><span>草稿</span></div>
          <div className="admin-stat"><strong>{stats.rejected}</strong><span>已退回</span></div>
          <div className="admin-stat admin-stat--accent"><strong>♥ {stats.likes}</strong><span>收到的喜歡</span></div>
        </div>
      )}

      {member ? (
        <Uploader onUploaded={(artwork) => {
          setArtworks((current) => [...(current || []), artwork]);
          loadStats();
        }} />
      ) : (
        <div className="admin-empty">
          <h2 className="admin-subtitle">想展出自己的作品嗎？</h2>
          <p className="admin-muted">訪客只能瀏覽。註冊成為會員後，就能上傳作品並送出審核，這個帳號也會保留下來。</p>
          <a className="admin-button admin-button--primary" href="#me/profile">註冊成為會員</a>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}

      {member && (
        <>
          <div className="admin-page__head admin-page__head--section">
            <h2 className="admin-subtitle">我的作品</h2>
            <div className="admin-chips">
              {FILTERS.map((id) => (
                <button key={id} className={`admin-chip${filter === id ? " admin-chip--active" : ""}`} onClick={() => setFilter(id)}>
                  {id === "all" ? "全部" : STATUS[id]} {count(id)}
                </button>
              ))}
            </div>
          </div>
          {artworks === null ? <div className="admin-spinner" /> : (
            <>
              <ArtworkGrid
                artworks={shown}
                mode="mine"
                onChange={replace}
                onRemove={(artwork) => {
                  setArtworks((current) => current.filter((item) => item.id !== artwork.id));
                  loadStats();
                }}
                onError={setError}
              />
              {!shown.length && <p className="admin-muted">這裡還沒有作品。</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
