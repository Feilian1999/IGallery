import * as React from "react";
import {api} from "../api";
import {useSession} from "../session";
import {AI_USAGE} from "../shared/aiUsage";
import limits from "../shared/artworkLimits.json";

// Admin: artworks members have sent for review.
const ReviewQueue = () => {
  const {refresh} = useSession();
  const [artworks, setArtworks] = React.useState(null);
  const [rejecting, setRejecting] = React.useState(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/admin/artworks?status=pending").then((data) => setArtworks(data.artworks)).catch((failure) => setError(failure.message));
  }, []);

  const decide = async (artwork, path, body) => {
    setError("");
    try {
      await api(path, {method: "POST", body});
      setArtworks((current) => current.filter((item) => item.id !== artwork.id));
      setRejecting(null);
      setReason("");
      refresh();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Review</div>
          <h1 className="admin-title">待審核作品</h1>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {artworks === null ? <div className="admin-spinner" /> : !artworks.length ? (
        <p className="admin-muted">目前沒有待審核的作品。</p>
      ) : artworks.map((artwork) => (
        <article key={artwork.id} className="admin-review">
          <a href={artwork.imageUrl} target="_blank" rel="noreferrer" className="admin-review__image">
            <img src={artwork.previewUrl} alt="" />
          </a>
          <div className="admin-review__body">
            <h2 className="admin-subtitle">{artwork.title || "未命名"}</h2>
            <dl className="admin-review__meta">
              <dt>上傳者</dt><dd>{artwork.owner ? <a className="admin-link" href={`#users/${artwork.owner.id}`}>{artwork.owner.displayName}</a> : "—"}</dd>
              <dt>作者</dt><dd>{artwork.author || "--"}</dd>
              <dt>角色</dt><dd>{artwork.character || "--"}</dd>
              <dt>AI</dt><dd>{AI_USAGE[artwork.aiUsage]?.name}</dd>
              <dt>描述</dt><dd>{artwork.description || "--"}</dd>
            </dl>
            {rejecting === artwork.id ? (
              <div className="admin-review__reject">
                <textarea rows={2} value={reason} maxLength={limits.reviewNote} placeholder="告訴上傳者需要修改什麼" onChange={(event) => setReason(event.target.value)} autoFocus />
                <div className="admin-actions">
                  <button className="admin-button admin-button--danger" onClick={() => decide(artwork, `/admin/artworks/${artwork.id}/reject`, {reason})}>確定退回</button>
                  <button className="admin-button admin-button--ghost" onClick={() => setRejecting(null)}>取消</button>
                </div>
              </div>
            ) : (
              <div className="admin-actions">
                <button className="admin-button admin-button--primary" onClick={() => decide(artwork, `/admin/artworks/${artwork.id}/approve`)}>核准公開</button>
                <button className="admin-button" onClick={() => {
                  setRejecting(artwork.id);
                  setReason("");
                }}>退回</button>
                <a className="admin-button admin-button--ghost" href={`#me/artwork/${artwork.id}`}>查看細節</a>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
};

export default ReviewQueue;
