import * as React from "react";
import PropTypes from "prop-types";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {useSession, isAdmin} from "../session";
import {AI_USAGE, AI_CHOICES} from "../shared/aiUsage";
import {formatTime} from "../i18n";
import {uploadImage, checkFile} from "./upload";
import limits from "../shared/artworkLimits.json";
import {drawLabelCanvas, labelRows} from "../gallery/labelCanvas";
import THEMES from "../gallery/themes";

const FIELDS = [
  {key: "title"},
  {key: "author"},
  {key: "character"},
  {key: "description", multiline: 3},
  {key: "story", multiline: 8},
];
const EDITABLE = [...FIELDS.map((field) => field.key), "hotspots", "aiUsage"];

const BLANK = {title: "", author: "", character: "", description: "", story: "", hotspots: [], aiUsage: "unspecified"};

const pick = (artwork) => Object.fromEntries(EDITABLE.map((key) => [key, artwork[key]]));
const clamp = (value) => Math.min(1, Math.max(0, value));

// The image with its hotspots. Click empty space to add one; drag a dot to move it.
const HotspotCanvas = ({artwork, hotspots, selected, onSelect, onChange}) => {
  const {t} = useTranslation("studio");
  const frame = React.useRef();
  const drag = React.useRef(null);

  const positionOf = (event) => {
    const rect = frame.current.getBoundingClientRect();
    return {x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height)};
  };

  const add = (event) => {
    if (hotspots.length >= limits.hotspots) return;
    const point = positionOf(event);
    onChange([...hotspots, {...point, label: t("editor.hotspotDefault", {number: hotspots.length + 1}), note: ""}]);
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
      <p className="admin-muted">{t("editor.hotspotHint", {max: limits.hotspots})}</p>
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

// Picks the image for a new artwork: click or drop one file.
const ImagePicker = ({onPick}) => {
  const {t} = useTranslation("studio");
  const [over, setOver] = React.useState(false);
  const input = React.useRef();
  return (
    <div
      className={`admin-drop admin-drop--tall${over ? " admin-drop--over" : ""}`}
      onClick={() => input.current.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (event.dataTransfer.files[0]) onPick(event.dataTransfer.files[0]);
      }}
    >
      <div className="admin-drop__title">{t("editor.dropTitle")}</div>
      <div className="admin-muted">{t("editor.dropTypes", {size: limits.maxUploadMB})}</div>
      <input ref={input} type="file" accept={limits.imageTypes.join(",")} hidden onChange={(event) => {
        if (event.target.files[0]) onPick(event.target.files[0]);
        event.target.value = "";
      }} />
    </div>
  );
};

ImagePicker.propTypes = {onPick: PropTypes.func.isRequired};

// Edits an artwork, or with no `id` creates one: the image uploads in the background
// while the details are filled in, and nothing is saved until the draft or submit button.
const ArtworkEditor = ({id}) => {
  const {t, i18n} = useTranslation("studio");
  const language = i18n.resolvedLanguage;
  const isNew = !id;
  const {session, refresh} = useSession();
  const [artwork, setArtwork] = React.useState(null);
  const [draft, setDraft] = React.useState(isNew ? {...BLANK, author: session.user.displayName} : null);
  // new artworks: the chosen file shown locally, and its upload
  const [local, setLocal] = React.useState(null);
  const [progress, setProgress] = React.useState(null);
  const upload = React.useRef(null);
  const [selected, setSelected] = React.useState(null);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);

  React.useEffect(() => () => local && URL.revokeObjectURL(local.imageUrl), [local]);

  React.useEffect(() => {
    if (isNew) return;
    api(`/me/artworks/${encodeURIComponent(id)}`)
        .then(({artwork}) => {
          setArtwork(artwork);
          setDraft(pick(artwork));
        })
        .catch((failure) => setError(failure.message));
  }, [id, isNew]);

  const dirty = isNew ? Boolean(local) && !saving : artwork && draft && JSON.stringify(pick(artwork)) !== JSON.stringify(draft);

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
    // the row headings are translated, so redraw on a language switch
  }, [draft, language]);

  if (!isNew && error && !artwork) return <div className="admin-page"><div className="admin-error">{error}</div><a className="admin-link" href="#me">{t("backToMine")}</a></div>;
  if (!isNew && (!artwork || !draft)) return <div className="admin-page"><div className="admin-spinner" /></div>;

  const set = (patch) => setDraft((current) => ({...current, ...patch}));
  const setHotspot = (index, patch) => set({hotspots: draft.hotspots.map((spot, i) => (i === index ? {...spot, ...patch} : spot))});

  const pickFile = async (file) => {
    const problem = checkFile(file);
    if (problem) return setError(problem);
    setError("");
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return setError(t("editor.unreadable"));
    setLocal({imageUrl: URL.createObjectURL(file), width: bitmap.width, height: bitmap.height, title: ""});
    bitmap.close();
    set({hotspots: [], ...(draft.title ? {} : {title: file.name.replace(/\.[^.]+$/, "").slice(0, limits.title)})});
    setProgress(0);
    const job = uploadImage(file, session, (value) => upload.current === job && setProgress(value));
    upload.current = job;
    job.catch((failure) => {
      if (upload.current !== job) return;
      setError(failure.message);
      setLocal(null);
      setProgress(null);
      upload.current = null;
    });
  };

  // creates the artwork once the upload finishes, then continues in the normal editor
  const create = async (submit) => {
    if (draft.aiUsage === "unspecified") return setError(t("editor.aiRequired"));
    setSaving(true);
    setError("");
    try {
      const image = await upload.current;
      const {artwork: created} = await api("/me/artworks", {method: "POST", body: {...image, ...draft}});
      if (submit) await api(`/me/artworks/${encodeURIComponent(created.id)}/submit`, {method: "POST"});
      refresh();
      window.location.replace(`#me/artwork/${encodeURIComponent(created.id)}`);
    } catch (failure) {
      setError(failure.message);
      setSaving(false);
    }
  };

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
  const mine = isNew || artwork.owner?.id === session.user.id;

  const leave = (event) => {
    if (dirty && !window.confirm(t("editor.leaveConfirm"))) event.preventDefault();
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <a className="admin-link" href={mine ? "#me" : "#admin/artworks"} onClick={leave}>← {mine ? t("editor.myArtworks") : t("editor.allArtworks")}</a>
          <h1 className="admin-title">{draft.title || (isNew ? t("editor.newTitle") : t("untitled"))}</h1>
        </div>
        {isNew ? (
          <div className="admin-actions">
            <span className="admin-muted">
              {progress === null ? "" : progress < 1 ? t("editor.uploading", {percent: Math.round(progress * 100)}) : t("editor.uploaded")}
            </span>
            <button className="admin-button" onClick={() => create(false)} disabled={!local || saving}>{t("editor.saveDraft")}</button>
            <button className="admin-button admin-button--primary" onClick={() => create(true)} disabled={!local || saving}>
              {saving ? t("editor.processing") : admin ? t("editor.publish") : t("editor.submit")}
            </button>
          </div>
        ) : (
        <div className="admin-actions">
          <span className={`admin-status admin-status--${artwork.status} admin-status--inline`}>{t(`status.${artwork.status}`)}</span>
          {(artwork.status === "draft" || artwork.status === "rejected") && (
            <button className="admin-button" onClick={() => transition("submit")}>{admin ? t("editor.publish") : t("editor.submit")}</button>
          )}
          {(artwork.status === "pending" || artwork.status === "published") && (
            <button className="admin-button" onClick={() => transition("withdraw")}>{artwork.status === "pending" ? t("editor.withdraw") : t("editor.unpublish")}</button>
          )}
          <span className="admin-muted">{dirty ? t("editor.unsaved") : savedAt ? t("editor.savedAt", {time: formatTime(savedAt)}) : ""}</span>
          <button className="admin-button admin-button--primary" onClick={save} disabled={!dirty || saving}>{saving ? t("saving") : t("save")}</button>
        </div>
        )}
      </div>
      {error && <div className="admin-error">{error}</div>}
      {isNew && !admin && <div className="admin-notice admin-notice--inline">{t("editor.newNotice")}</div>}
      {artwork?.status === "rejected" && artwork.reviewNote && (
        <div className="admin-review-note admin-review-note--banner">{t("editor.rejectedBanner", {note: artwork.reviewNote})}</div>
      )}
      {artwork?.status === "pending" && <div className="admin-notice admin-notice--inline">{t("editor.pendingNotice")}</div>}
      <div className="admin-editor">
        {isNew && !local ? <ImagePicker onPick={pickFile} /> : (
          <div>
            <HotspotCanvas
              artwork={isNew ? local : artwork}
              hotspots={draft.hotspots}
              selected={selected}
              onSelect={setSelected}
              onChange={(hotspots) => set({hotspots})}
            />
            {isNew && (
              <div className="admin-actions">
                {progress !== null && progress < 1 && <span className="admin-progress"><span style={{width: `${Math.round(progress * 100)}%`}} /></span>}
                <button className="admin-button admin-button--ghost" disabled={saving} onClick={() => {
                  upload.current = null;
                  setLocal(null);
                  setProgress(null);
                }}>{t("editor.replaceImage")}</button>
              </div>
            )}
          </div>
        )}
        <div className="admin-editor__form">
          <div className="admin-ai">
            <div className="admin-ai__label">{t("editor.aiLabel")}<em>{t("editor.required")}</em></div>
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
                <span>{t(`editor.fields.${field.key}`)}<em>{value.length} / {limits[field.key]}</em></span>
                <Input value={value} maxLength={limits[field.key]} rows={field.multiline} onChange={(event) => set({[field.key]: event.target.value})} />
              </label>
            );
          })}

          <h2 className="admin-subtitle">{t("editor.hotspots")}</h2>
          {!draft.hotspots.length && <p className="admin-muted">{t("editor.noHotspots")}</p>}
          {draft.hotspots.map((spot, index) => (
            <div key={index} className={`admin-spot${selected === index ? " admin-spot--selected" : ""}`} onClick={() => setSelected(index)}>
              <span className="admin-spot__index">{index + 1}</span>
              <div className="admin-spot__fields">
                <input value={spot.label} maxLength={limits.hotspotLabel} placeholder={t("editor.hotspotName")} onChange={(event) => setHotspot(index, {label: event.target.value})} />
                <textarea value={spot.note} maxLength={limits.hotspotNote} rows={2} placeholder={t("editor.hotspotNote")} onChange={(event) => setHotspot(index, {note: event.target.value})} />
              </div>
              <button className="admin-button admin-button--ghost" onClick={(event) => {
                event.stopPropagation();
                set({hotspots: draft.hotspots.filter((_, i) => i !== index)});
                setSelected(null);
              }}>{t("delete")}</button>
            </div>
          ))}

          <h2 className="admin-subtitle">{t("editor.labelPreview")}</h2>
          <img className="admin-label-preview" src={labelPreview} alt={t("editor.labelPreviewAlt")} />
        </div>
      </div>
    </div>
  );
};

ArtworkEditor.propTypes = {id: PropTypes.string};

export default ArtworkEditor;
