import * as React from "react";
import PropTypes from "prop-types";
import {api} from "../api";
import {useSession, isAdmin} from "../session";
import {AI_USAGE} from "../shared/aiUsage";

export const STATUS = {
  draft: "草稿",
  pending: "審核中",
  published: "已公開",
  rejected: "已退回",
};

// Artwork cards. "mine" shows the owner's actions (submit / withdraw); "all" is the
// admin view with publish / unpublish, owners, and drag-to-reorder.
const ArtworkGrid = ({artworks, mode, onChange, onRemove, onReorder, onError}) => {
  const {session, refresh} = useSession();
  const [dragged, setDragged] = React.useState(null);
  const admin = isAdmin(session);

  const run = async (action) => {
    onError("");
    try {
      await action();
    } catch (failure) {
      onError(failure.message);
    }
  };

  const act = (artwork, path, body) => run(async () => {
    const {artwork: updated} = await api(path, {method: body ? "PATCH" : "POST", body});
    onChange(updated);
    if (admin) refresh();
  });

  const remove = (artwork) => {
    if (!window.confirm(`確定要刪除「${artwork.title || "未命名"}」嗎？圖片檔也會一起刪除，無法復原。`)) return;
    run(async () => {
      await api(mode === "all" ? `/admin/artworks/${artwork.id}` : `/me/artworks/${artwork.id}`, {method: "DELETE"});
      onRemove(artwork);
    });
  };

  // drag a card onto another to move it there
  const drop = (target) => {
    if (!dragged || dragged === target.id) return;
    const order = artworks.filter((item) => item.id !== dragged);
    order.splice(order.findIndex((item) => item.id === target.id), 0, artworks.find((item) => item.id === dragged));
    setDragged(null);
    onReorder(order);
  };

  const actions = (artwork) => {
    if (mode === "all") {
      return artwork.status === "published" ?
        <button className="admin-button" onClick={() => act(artwork, `/admin/artworks/${artwork.id}`, {status: "draft"})}>下架</button> :
        <button className="admin-button" onClick={() => act(artwork, `/admin/artworks/${artwork.id}/approve`)}>公開</button>;
    }
    if (artwork.status === "draft" || artwork.status === "rejected") {
      return <button className="admin-button" onClick={() => act(artwork, `/me/artworks/${artwork.id}/submit`)}>{admin ? "公開" : "送審"}</button>;
    }
    return <button className="admin-button" onClick={() => act(artwork, `/me/artworks/${artwork.id}/withdraw`)}>{artwork.status === "pending" ? "撤回" : "下架"}</button>;
  };

  return (
    <div className="admin-grid">
      {artworks.map((artwork) => (
        <article
          key={artwork.id}
          className={`admin-card${dragged === artwork.id ? " admin-card--dragging" : ""}`}
          draggable={Boolean(onReorder)}
          onDragStart={() => setDragged(artwork.id)}
          onDragEnd={() => setDragged(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => drop(artwork)}
        >
          <a className="admin-card__image" href={`#me/artwork/${artwork.id}`} draggable={false}>
            <img src={artwork.previewUrl} alt="" draggable={false} />
            <span className={`admin-status admin-status--${artwork.status}`}>{STATUS[artwork.status]}</span>
            {AI_USAGE[artwork.aiUsage]?.short && <span className="admin-ai-tag">{AI_USAGE[artwork.aiUsage].short}</span>}
          </a>
          <div className="admin-card__body">
            <div className="admin-card__title">{artwork.title || "未命名"}</div>
            <div className="admin-muted">
              {mode === "all" ? `${artwork.owner?.displayName || "—"} · ` : ""}♥ {artwork.likes} · {artwork.hotspots.length} 個熱點
            </div>
            {artwork.status === "rejected" && artwork.reviewNote && <div className="admin-review-note">退回原因：{artwork.reviewNote}</div>}
          </div>
          <div className="admin-card__actions">
            <a className="admin-button" href={`#me/artwork/${artwork.id}`}>編輯</a>
            {actions(artwork)}
            <button className="admin-button admin-button--danger" onClick={() => remove(artwork)}>刪除</button>
          </div>
        </article>
      ))}
    </div>
  );
};

ArtworkGrid.propTypes = {
  artworks: PropTypes.array.isRequired,
  mode: PropTypes.oneOf(["mine", "all"]).isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onReorder: PropTypes.func,
  onError: PropTypes.func.isRequired,
};

export default ArtworkGrid;
