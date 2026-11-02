import * as React from "react";
import PropTypes from "prop-types";
import {api} from "../api";
import {useSession, isAdmin} from "../session";
import {uploadArtwork, checkFile} from "./upload";
import limits from "../shared/artworkLimits.json";
import {AI_USAGE, AI_CHOICES} from "../shared/aiUsage";

export const STATUS = {
  draft: "草稿",
  pending: "審核中",
  published: "已公開",
  rejected: "已退回",
};

// two uploads at a time keeps the browser responsive while resizing big images
const PARALLEL_UPLOADS = 2;

// Drop zone. The uploader must say whether the work used AI before choosing files.
export const Uploader = ({onUploaded}) => {
  const {session} = useSession();
  const [aiUsage, setAiUsage] = React.useState(null);
  const [jobs, setJobs] = React.useState([]);
  const [over, setOver] = React.useState(false);
  const input = React.useRef();

  const update = (key, patch) => setJobs((current) => current.map((job) => (job.key === key ? {...job, ...patch} : job)));

  const start = async (files) => {
    if (!aiUsage) return;
    const queued = [...files].map((file) => ({key: `${file.name}-${file.size}-${Math.random()}`, file, name: file.name, progress: 0, error: checkFile(file)}));
    setJobs((current) => [...queued, ...current]);
    const pending = queued.filter((job) => !job.error);
    const worker = async () => {
      while (pending.length) {
        const job = pending.shift();
        try {
          const artwork = await uploadArtwork(job.file, session, aiUsage, (progress) => update(job.key, {progress}));
          update(job.key, {progress: 1, done: true});
          onUploaded(artwork);
        } catch (error) {
          update(job.key, {error: error.message});
        }
      }
    };
    await Promise.all(Array.from({length: PARALLEL_UPLOADS}, worker));
    // finished uploads fade out of the queue after a moment
    setTimeout(() => setJobs((current) => current.filter((job) => !job.done)), 2500);
  };

  return (
    <section>
      <div className="admin-ai">
        <div className="admin-ai__label">這批作品是否使用 AI？<em>必填</em></div>
        <div className="admin-ai__choices">
          {AI_CHOICES.map((id) => (
            <button key={id} type="button" className={`admin-ai__choice${aiUsage === id ? " admin-ai__choice--active" : ""}`} onClick={() => setAiUsage(id)}>
              <strong>{AI_USAGE[id].name}</strong>
              <span>{AI_USAGE[id].hint}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        className={`admin-drop${over ? " admin-drop--over" : ""}${aiUsage ? "" : " admin-drop--disabled"}`}
        onClick={() => aiUsage && input.current.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (aiUsage) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          start(event.dataTransfer.files);
        }}
      >
        <div className="admin-drop__title">{aiUsage ? "把圖片拖到這裡，或點擊選擇檔案" : "請先選擇上面的 AI 使用情況"}</div>
        <div className="admin-muted">JPEG、PNG、WebP，每張最大 {limits.maxUploadMB} MB，可一次選多張。上傳後會先存成草稿，編輯完再送出審核。</div>
        <input ref={input} type="file" accept={limits.imageTypes.join(",")} multiple hidden onChange={(event) => {
          start(event.target.files);
          event.target.value = "";
        }} />
      </div>
      {jobs.length > 0 && (
        <ul className="admin-jobs">
          {jobs.map((job) => (
            <li key={job.key} className={`admin-job${job.error ? " admin-job--error" : ""}`}>
              <span className="admin-job__name">{job.name}</span>
              {job.error ? <span>{job.error}</span> : (
                <span className="admin-progress"><span style={{width: `${Math.round(job.progress * 100)}%`}} /></span>
              )}
              {job.error && <button className="admin-button admin-button--ghost" onClick={() => setJobs((current) => current.filter((item) => item.key !== job.key))}>移除</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

Uploader.propTypes = {onUploaded: PropTypes.func.isRequired};

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
