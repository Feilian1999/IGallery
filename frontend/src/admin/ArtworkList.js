import * as React from "react";
import PropTypes from "prop-types";
import {api} from "./api";
import {uploadArtwork, checkFile} from "./upload";
import limits from "../shared/artworkLimits.json";

const FILTERS = [
  {id: "all", name: "全部"},
  {id: "published", name: "已發佈"},
  {id: "draft", name: "草稿"},
];
// two uploads at a time keeps the browser responsive while resizing big images
const PARALLEL_UPLOADS = 2;

const Uploader = ({storage, onUploaded}) => {
  const [jobs, setJobs] = React.useState([]);
  const [over, setOver] = React.useState(false);
  const input = React.useRef();

  const update = (key, patch) => setJobs((current) => current.map((job) => (job.key === key ? {...job, ...patch} : job)));

  const start = async (files) => {
    const queued = [...files].map((file) => ({key: `${file.name}-${file.size}-${Math.random()}`, file, name: file.name, progress: 0, error: checkFile(file)}));
    setJobs((current) => [...queued, ...current]);
    const pending = queued.filter((job) => !job.error);
    const worker = async () => {
      while (pending.length) {
        const job = pending.shift();
        try {
          const artwork = await uploadArtwork(job.file, storage, (progress) => update(job.key, {progress}));
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
      <div
        className={`admin-drop${over ? " admin-drop--over" : ""}`}
        onClick={() => input.current.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          start(event.dataTransfer.files);
        }}
      >
        <div className="admin-drop__title">把圖片拖到這裡，或點擊選擇檔案</div>
        <div className="admin-muted">JPEG、PNG、WebP，每張最大 {limits.maxUploadMB} MB，可一次選多張。上傳後會先存成草稿。</div>
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

Uploader.propTypes = {storage: PropTypes.string.isRequired, onUploaded: PropTypes.func.isRequired};

const ArtworkList = ({storage}) => {
  const [artworks, setArtworks] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [error, setError] = React.useState("");
  const [dragged, setDragged] = React.useState(null);

  React.useEffect(() => {
    api("/admin/artworks").then((data) => setArtworks(data.artworks)).catch((failure) => setError(failure.message));
  }, []);

  const run = async (action) => {
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
    }
  };

  const toggleStatus = (artwork) => run(async () => {
    const status = artwork.status === "published" ? "draft" : "published";
    const {artwork: updated} = await api(`/admin/artworks/${artwork.id}`, {method: "PATCH", body: {status}});
    setArtworks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  });

  const remove = (artwork) => {
    if (!window.confirm(`確定要刪除「${artwork.title || "未命名"}」嗎？圖片檔也會一起刪除，無法復原。`)) return;
    run(async () => {
      await api(`/admin/artworks/${artwork.id}`, {method: "DELETE"});
      setArtworks((current) => current.filter((item) => item.id !== artwork.id));
    });
  };

  // drag a card onto another to move it there; the new order is saved right away
  const drop = (target) => {
    if (!dragged || dragged === target.id) return;
    const order = artworks.filter((item) => item.id !== dragged);
    order.splice(order.findIndex((item) => item.id === target.id), 0, artworks.find((item) => item.id === dragged));
    setArtworks(order);
    setDragged(null);
    run(() => api("/admin/artworks/order", {method: "PUT", body: {ids: order.map((item) => item.id)}}));
  };

  const shown = (artworks || []).filter((artwork) => filter === "all" || artwork.status === filter);
  const counts = {
    all: artworks?.length || 0,
    published: artworks?.filter((artwork) => artwork.status === "published").length || 0,
    draft: artworks?.filter((artwork) => artwork.status === "draft").length || 0,
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Collection</div>
          <h1 className="admin-title">作品</h1>
        </div>
        <div className="admin-chips">
          {FILTERS.map((item) => (
            <button key={item.id} className={`admin-chip${filter === item.id ? " admin-chip--active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.name} {counts[item.id]}
            </button>
          ))}
        </div>
      </div>
      <Uploader storage={storage} onUploaded={(artwork) => setArtworks((current) => [...(current || []), artwork])} />
      {error && <div className="admin-error">{error}</div>}
      {artworks === null ? <div className="admin-spinner" /> : (
        <>
          {filter === "all" && artworks.length > 1 && <p className="admin-muted">拖曳卡片可以調整排序，懸浮展廳和首頁會照這個順序展出。</p>}
          <div className="admin-grid">
            {shown.map((artwork) => (
              <article
                key={artwork.id}
                className={`admin-card${dragged === artwork.id ? " admin-card--dragging" : ""}`}
                draggable={filter === "all"}
                onDragStart={() => setDragged(artwork.id)}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => drop(artwork)}
              >
                <a className="admin-card__image" href={`#admin/artwork/${artwork.id}`} draggable={false}>
                  <img src={artwork.previewUrl} alt="" draggable={false} />
                  <span className={`admin-status admin-status--${artwork.status}`}>{artwork.status === "published" ? "已發佈" : "草稿"}</span>
                </a>
                <div className="admin-card__body">
                  <div className="admin-card__title">{artwork.title || "未命名"}</div>
                  <div className="admin-muted">{artwork.author || "作者未填"} · {artwork.hotspots.length} 個熱點</div>
                </div>
                <div className="admin-card__actions">
                  <a className="admin-button" href={`#admin/artwork/${artwork.id}`}>編輯</a>
                  <button className="admin-button" onClick={() => toggleStatus(artwork)}>{artwork.status === "published" ? "下架" : "發佈"}</button>
                  <button className="admin-button admin-button--danger" onClick={() => remove(artwork)}>刪除</button>
                </div>
              </article>
            ))}
          </div>
          {!shown.length && <p className="admin-muted">這裡還沒有作品。</p>}
        </>
      )}
    </div>
  );
};

ArtworkList.propTypes = {storage: PropTypes.string.isRequired};

export default ArtworkList;
