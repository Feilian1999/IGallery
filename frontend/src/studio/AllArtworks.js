import * as React from "react";
import {api} from "../api";
import ArtworkGrid, {STATUS} from "./ArtworkGrid";

const FILTERS = ["all", "published", "pending", "draft", "rejected"];

// Admin: every artwork from every member, with drag-to-reorder.
const AllArtworks = () => {
  const [artworks, setArtworks] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/admin/artworks").then((data) => setArtworks(data.artworks)).catch((failure) => setError(failure.message));
  }, []);

  const shown = (artworks || []).filter((artwork) => filter === "all" || artwork.status === filter);
  const count = (status) => (artworks || []).filter((artwork) => status === "all" || artwork.status === status).length;

  const reorder = async (order) => {
    setArtworks(order);
    try {
      await api("/admin/artworks/order", {method: "PUT", body: {ids: order.map((item) => item.id)}});
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Collection</div>
          <h1 className="admin-title">所有作品</h1>
        </div>
        <div className="admin-chips">
          {FILTERS.map((id) => (
            <button key={id} className={`admin-chip${filter === id ? " admin-chip--active" : ""}`} onClick={() => setFilter(id)}>
              {id === "all" ? "全部" : STATUS[id]} {count(id)}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {filter === "all" && <p className="admin-muted">拖曳卡片可以調整排序，首頁和懸浮展廳會照這個順序展出。</p>}
      {artworks === null ? <div className="admin-spinner" /> : (
        <ArtworkGrid
          artworks={shown}
          mode="all"
          onChange={(updated) => setArtworks((current) => current.map((item) => (item.id === updated.id ? updated : item)))}
          onRemove={(artwork) => setArtworks((current) => current.filter((item) => item.id !== artwork.id))}
          onReorder={filter === "all" ? reorder : undefined}
          onError={setError}
        />
      )}
    </div>
  );
};

export default AllArtworks;
