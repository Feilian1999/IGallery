import * as React from "react";
import PropTypes from "prop-types";
import {api} from "../api";
import {useSession, isAdmin} from "../session";
import {AI_USAGE, AI_CHOICES} from "../shared/aiUsage";
import {STATUS} from "./ArtworkGrid";
import limits from "../shared/artworkLimits.json";
import {drawLabelCanvas, labelRows} from "../gallery/labelCanvas";
import THEMES from "../gallery/themes";

const FIELDS = [
  {key: "title", name: "標題"},
  {key: "author", name: "作者"},
  {key: "character", name: "角色"},
  {key: "description", name: "描述", multiline: 3},
  {key: "story", name: "作品背後的故事", multiline: 8},
];
const EDITABLE = [...FIELDS.map((field) => field.key), "hotspots", "aiUsage"];

const pick = (artwork) => Object.fromEntries(EDITABLE.map((key) => [key, artwork[key]]));
const clamp = (value) => Math.min(1, Math.max(0, value));

// The image with its hotspots. Click empty space to add one; drag a dot to move it.
const HotspotCanvas = ({artwork, hotspots, selected, onSelect, onChange}) => {
  const frame = React.useRef();
  const drag = React.useRef(null);

  const positionOf = (event) => {
    const rect = frame.current.getBoundingClientRect();
    return {x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height)};
  };

  const add = (event) => {
    if (hotspots.length >= limits.hotspots) return;
    const point = positionOf(event);
    onChange([...hotspots, {...point, label: `細節 ${hotspots.length + 1}`, note: ""}]);
    onSelect(hotspots.length);
  };

  return (
    <div className="admin-hotspots">
      <div ref={frame} className="admin-hotspots__frame" style={{aspectRatio: `${artwork.width} / ${artwork.height}`}} onClick={add}>
        <img src={artwork.imageUrl} alt={artwork.title} draggable={false} />
        {hotspots.map((spot, index) => (
          <button
            key={index}
            className={`admin-dot${selected === index ? " admin-dot--selected" : ""}`}
            style={{left: `${spot.x * 100}%`, top: `${spot.y * 100}%`}}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = index;
              onSelect(index);
            }}
            onPointerMove={(event) => {
              if (drag.current !== index) return;
              const point = positionOf(event);
              onChange(hotspots.map((item, i) => (i === index ? {...item, ...point} : item)));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <p className="admin-muted">點圖片新增細節熱點（最多 {limits.hotspots} 個），拖曳數字可以移動位置。</p>
    </div>
  );
};

HotspotCanvas.propTypes = {
  artwork: PropTypes.object.isRequired,
  hotspots: PropTypes.array.isRequired,
  selected: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ArtworkEditor = ({id}) => {
  const {session, refresh} = useSession();
  const [artwork, setArtwork] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);

  React.useEffect(() => {
    api(`/me/artworks/${encodeURIComponent(id)}`)
        .then(({artwork}) => {
          setArtwork(artwork);
          setDraft(pick(artwork));
        })
        .catch((failure) => setError(failure.message));
  }, [id]);

  const dirty = artwork && draft && JSON.stringify(pick(artwork)) !== JSON.stringify(draft);

  // warn before closing the tab with unsaved changes
  React.useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // the wall label exactly as the gallery will draw it
  const labelPreview = React.useMemo(() => {
    if (!draft) return null;
    return drawLabelCanvas({title: draft.title, rows: labelRows(draft), colors: THEMES.night.label}).toDataURL();
  }, [draft]);

  if (error && !artwork) return <div className="admin-page"><div className="admin-error">{error}</div><a className="admin-link" href="#me">← 回到我的作品</a></div>;
  if (!artwork || !draft) return <div className="admin-page"><div className="admin-spinner" /></div>;

  const set = (patch) => setDraft((current) => ({...current, ...patch}));
  const setHotspot = (index, patch) => set({hotspots: draft.hotspots.map((spot, i) => (i === index ? {...spot, ...patch} : spot))});

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // the API rejects "unspecified", so only send the label once one is chosen
      const body = draft.aiUsage === "unspecified" ? {...draft, aiUsage: undefined} : draft;
      const {artwork: updated} = await api(`/me/artworks/${encodeURIComponent(id)}`, {method: "PATCH", body});
      setArtwork(updated);
      setDraft(pick(updated));
      setSavedAt(new Date());
    } catch (failure) {
      setError(failure.message);
    }
    setSaving(false);
  };

  // submit / withdraw, saving any pending edits first
  const transition = async (action) => {
    if (dirty) await save();
    setError("");
    try {
      const {artwork: updated} = await api(`/me/artworks/${encodeURIComponent(id)}/${action}`, {method: "POST"});
      setArtwork(updated);
      setDraft(pick(updated));
      refresh();
    } catch (failure) {
      setError(failure.message);
    }
  };
  const admin = isAdmin(session);
  const mine = artwork.owner?.id === session.user.id;

  const leave = (event) => {
    if (dirty && !window.confirm("還有未儲存的修改，確定要離開嗎？")) event.preventDefault();
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <a className="admin-link" href={mine ? "#me" : "#admin/artworks"} onClick={leave}>← {mine ? "我的作品" : "所有作品"}</a>
          <h1 className="admin-title">{draft.title || "未命名"}</h1>
        </div>
        <div className="admin-actions">
          <span className={`admin-status admin-status--${artwork.status} admin-status--inline`}>{STATUS[artwork.status]}</span>
          {(artwork.status === "draft" || artwork.status === "rejected") && (
            <button className="admin-button" onClick={() => transition("submit")}>{admin ? "公開" : "送出審核"}</button>
          )}
          {(artwork.status === "pending" || artwork.status === "published") && (
            <button className="admin-button" onClick={() => transition("withdraw")}>{artwork.status === "pending" ? "撤回審核" : "下架"}</button>
          )}
          <span className="admin-muted">{dirty ? "有未儲存的修改" : savedAt ? `已儲存 ${savedAt.toLocaleTimeString("zh-TW")}` : ""}</span>
          <button className="admin-button admin-button--primary" onClick={save} disabled={!dirty || saving}>{saving ? "儲存中…" : "儲存"}</button>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {artwork.status === "rejected" && artwork.reviewNote && (
        <div className="admin-review-note admin-review-note--banner">管理者退回了這件作品：{artwork.reviewNote}。修改後可以再次送出審核。</div>
      )}
      {artwork.status === "pending" && <div className="admin-notice admin-notice--inline">審核中，管理者核准後就會公開在首頁和畫廊。</div>}
      <div className="admin-editor">
        <HotspotCanvas
          artwork={artwork}
          hotspots={draft.hotspots}
          selected={selected}
          onSelect={setSelected}
          onChange={(hotspots) => set({hotspots})}
        />
        <div className="admin-editor__form">
          <div className="admin-ai">
            <div className="admin-ai__label">AI 使用標註<em>必填</em></div>
            <div className="admin-ai__choices">
              {AI_CHOICES.map((choice) => (
                <button key={choice} type="button" className={`admin-ai__choice${draft.aiUsage === choice ? " admin-ai__choice--active" : ""}`} onClick={() => set({aiUsage: choice})}>
                  <strong>{AI_USAGE[choice].name}</strong>
                  <span>{AI_USAGE[choice].hint}</span>
                </button>
              ))}
            </div>
          </div>
          {FIELDS.map((field) => {
            const Input = field.multiline ? "textarea" : "input";
            const value = draft[field.key] || "";
            return (
              <label key={field.key} className="admin-field">
                <span>{field.name}<em>{value.length} / {limits[field.key]}</em></span>
                <Input value={value} maxLength={limits[field.key]} rows={field.multiline} onChange={(event) => set({[field.key]: event.target.value})} />
              </label>
            );
          })}

          <h2 className="admin-subtitle">細節熱點</h2>
          {!draft.hotspots.length && <p className="admin-muted">還沒有熱點，在左邊的圖上點一下就能新增。</p>}
          {draft.hotspots.map((spot, index) => (
            <div key={index} className={`admin-spot${selected === index ? " admin-spot--selected" : ""}`} onClick={() => setSelected(index)}>
              <span className="admin-spot__index">{index + 1}</span>
              <div className="admin-spot__fields">
                <input value={spot.label} maxLength={limits.hotspotLabel} placeholder="名稱" onChange={(event) => setHotspot(index, {label: event.target.value})} />
                <textarea value={spot.note} maxLength={limits.hotspotNote} rows={2} placeholder="說明" onChange={(event) => setHotspot(index, {note: event.target.value})} />
              </div>
              <button className="admin-button admin-button--ghost" onClick={(event) => {
                event.stopPropagation();
                set({hotspots: draft.hotspots.filter((_, i) => i !== index)});
                setSelected(null);
              }}>刪除</button>
            </div>
          ))}

          <h2 className="admin-subtitle">牆上說明牌預覽</h2>
          <img className="admin-label-preview" src={labelPreview} alt="說明牌預覽" />
        </div>
      </div>
    </div>
  );
};

ArtworkEditor.propTypes = {id: PropTypes.string.isRequired};

export default ArtworkEditor;
