import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {useSession, isMember} from "../session";
import ArtworkGrid from "./ArtworkGrid";

const FILTERS = ["all", "draft", "pending", "published", "rejected"];

// The signed-in user's home in the studio: numbers, upload, and their own artworks.
const Dashboard = () => {
  const {t} = useTranslation("studio");
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
          <h1 className="admin-title">{t("dashboard.greeting", {name: session.user.displayName})}</h1>
        </div>
        {member && <a className="admin-button admin-button--primary" href="#me/new">{t("publishArtwork")}</a>}
      </div>

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat"><strong>{stats.published}</strong><span>{t("status.published")}</span></div>
          <div className="admin-stat"><strong>{stats.pending}</strong><span>{t("status.pending")}</span></div>
          <div className="admin-stat"><strong>{stats.draft}</strong><span>{t("status.draft")}</span></div>
          <div className="admin-stat"><strong>{stats.rejected}</strong><span>{t("status.rejected")}</span></div>
          <div className="admin-stat admin-stat--accent"><strong>♥ {stats.likes}</strong><span>{t("dashboard.likes")}</span></div>
        </div>
      )}

      {!member && (
        <div className="admin-empty">
          <h2 className="admin-subtitle">{t("dashboard.guestTitle")}</h2>
          <p className="admin-muted">{t("dashboard.guestBody")}</p>
          <a className="admin-button admin-button--primary" href="#me/profile">{t("registerMember")}</a>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}

      {member && (
        <>
          <div className="admin-page__head admin-page__head--section">
            <h2 className="admin-subtitle">{t("dashboard.myArtworks")}</h2>
            <div className="admin-chips">
              {FILTERS.map((id) => (
                <button key={id} className={`admin-chip${filter === id ? " admin-chip--active" : ""}`} onClick={() => setFilter(id)}>
                  {t(id === "all" ? "all" : `status.${id}`)} {count(id)}
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
              {!shown.length && <p className="admin-muted">{t("dashboard.empty")}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
