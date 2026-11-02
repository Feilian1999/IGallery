import * as React from "react";
import {api} from "../api";
import slots from "../shared/exhibitionSlots.json";
import * as mainHall from "../gallery/layout/mainHall";
import * as festival from "../gallery/layout/festival";
import {MAX_PIECES} from "../gallery/layout/annex";

const ALL_SLOTS = [...slots.main, slots.feature, ...slots.festival];
// "主展廳・東牆", so a slot in the other hall is recognisable
const slotLabel = (slotId) => {
  const slot = ALL_SLOTS.find((item) => item.id === slotId);
  return slot && `${slots.festival.includes(slot) ? "夏日祭典" : "主展廳"}・${slot.name}`;
};
const MARKER_RADIUS = 1.15;

const toPath = (points) => points.map(([x, z], i) => `${i ? "L" : "M"}${x} ${z}`).join(" ") + " Z";

// Where a slot's marker sits on the plan: just in front of where the painting hangs.
const inFront = ({position, normal}) => [position[0] + normal[0] * 1.3, position[2] + normal[1] * 1.3];

const MainHallPlan = () => {
  const {SOUTH_WALL, PARTITIONS, PLATFORM} = mainHall;
  return (
    <>
      <path d={toPath(mainHall.BOUNDARY)} className="admin-plan__floor" />
      <line x1={SOUTH_WALL.door.from} y1="10" x2={SOUTH_WALL.door.to} y2="10" className="admin-plan__door" />
      <text x={(SOUTH_WALL.door.from + SOUTH_WALL.door.to) / 2} y="11.3" className="admin-plan__note">入口</text>
      {PARTITIONS.map((partition, i) => (
        <line key={i} x1={partition.start[0]} y1={partition.start[1]} x2={partition.end[0]} y2={partition.end[1]} className="admin-plan__wall" />
      ))}
      <circle cx={PLATFORM.center[0]} cy={PLATFORM.center[1]} r={PLATFORM.radius} className="admin-plan__platform" />
    </>
  );
};

const FestivalPlan = () => {
  const {SQUARE, STALL, STALLS, STAGE, YAGURA, TORII} = festival;
  return (
    <>
      <path d={toPath([[SQUARE.minX, SQUARE.minZ], [SQUARE.maxX, SQUARE.minZ], [SQUARE.maxX, SQUARE.maxZ], [SQUARE.minX, SQUARE.maxZ]])} className="admin-plan__floor" />
      {STALLS.map((stall) => (
        <rect key={stall.slot} x={stall.facing > 0 ? stall.x : stall.x - STALL.depth - 0.3} y={stall.z - STALL.width / 2} width={STALL.depth + 0.3} height={STALL.width} className="admin-plan__platform" />
      ))}
      <rect x={YAGURA.center[0] - YAGURA.size / 2} y={YAGURA.center[1] - YAGURA.size / 2} width={YAGURA.size} height={YAGURA.size} className="admin-plan__platform" />
      <text x={YAGURA.center[0]} y={YAGURA.center[1] + 0.35} className="admin-plan__note">櫓</text>
      <rect x={STAGE.center[0] - STAGE.width / 2} y={STAGE.center[1] - STAGE.depth / 2} width={STAGE.width} height={STAGE.depth} className="admin-plan__platform" />
      <line x1={TORII.center[0] - TORII.width / 2} y1={TORII.center[1]} x2={TORII.center[0] + TORII.width / 2} y2={TORII.center[1]} className="admin-plan__door" />
      <text x={TORII.center[0]} y={TORII.center[1] + 1.3} className="admin-plan__note">鳥居</text>
    </>
  );
};

// The halls whose walls the admins arrange. The annex shows everything on its own.
const HALLS = {
  main: {
    name: "主展廳", eyebrow: "Main Hall", viewBox: "-15.5 -15.5 31 28", Plan: MainHallPlan,
    slots: [...slots.main, slots.feature],
    marker: (slotId) => (slotId === slots.feature.id ? mainHall.PLATFORM.center : inFront(mainHall.SLOT_PLACEMENTS[slotId])),
  },
  festival: {
    name: "夏日祭典", eyebrow: "Summer Festival", viewBox: "-14.5 -16.5 29 29.5", Plan: FestivalPlan,
    slots: slots.festival,
    marker: (slotId) => inFront(festival.SLOT_PLACEMENTS[slotId]),
  },
};

const ExhibitionEditor = () => {
  const [artworks, setArtworks] = React.useState(null);
  const [placements, setPlacements] = React.useState({});
  const [saved, setSaved] = React.useState({});
  const [hallId, setHallId] = React.useState("main");
  const [selected, setSelected] = React.useState(slots.main[0].id);
  const hall = HALLS[hallId];
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    Promise.all([api("/admin/artworks"), api("/admin/exhibition")])
        .then(([list, exhibition]) => {
          setArtworks(list.artworks);
          setPlacements(exhibition.placements);
          setSaved(exhibition.placements);
        })
        .catch((failure) => setError(failure.message));
  }, []);

  if (!artworks) return <div className="admin-page">{error ? <div className="admin-error">{error}</div> : <div className="admin-spinner" />}</div>;

  const byId = Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork]));
  const published = artworks.filter((artwork) => artwork.status === "published");
  const dirty = JSON.stringify(placements) !== JSON.stringify(saved);
  const slotName = ALL_SLOTS.find((slot) => slot.id === selected)?.name;

  const assign = (artworkId) => setPlacements((current) => {
    const next = {...current};
    if (artworkId) next[selected] = artworkId;
    else delete next[selected];
    return next;
  });

  // fill this hall's empty slots with published artworks that aren't hung anywhere yet
  const autoFill = () => setPlacements((current) => {
    const next = {...current};
    const used = new Set(Object.values(next));
    const free = published.filter((artwork) => !used.has(artwork.id));
    hall.slots.filter((slot) => slot.id !== slots.feature.id).forEach((slot) => {
      if (!next[slot.id] && free.length) next[slot.id] = free.shift().id;
    });
    return next;
  });

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/admin/exhibition", {method: "PUT", body: {placements}});
      setSaved(result.placements);
      setPlacements(result.placements);
    } catch (failure) {
      setError(failure.message);
    }
    setBusy(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">{hall.eyebrow}</div>
          <h1 className="admin-title">展場配置</h1>
        </div>
        <div className="admin-actions">
          <button className="admin-button" onClick={autoFill}>自動填滿空位</button>
          <button className="admin-button admin-button--primary" onClick={save} disabled={!dirty || busy}>{busy ? "儲存中…" : dirty ? "儲存配置" : "已儲存"}</button>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-segmented admin-hall-tabs">
        {Object.entries(HALLS).map(([id, item]) => (
          <button key={id} type="button" className={id === hallId ? "admin-segmented--active" : ""} onClick={() => {
            setHallId(id);
            setSelected(item.slots[0].id);
          }}>{item.name}</button>
        ))}
      </div>
      <div className="admin-exhibition">
        <div className="admin-plan">
          <svg viewBox={hall.viewBox}>
            <defs>
              {/* one pattern per artwork, even if it hangs in two slots */}
              {[...new Set(Object.values(placements))].filter((id) => byId[id]).map((id) => (
                <pattern key={id} id={`plan-${id}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                  <image href={byId[id].previewUrl} width="1" height="1" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              ))}
            </defs>
            <hall.Plan />
            {hall.slots.map((slot) => {
              const [x, z] = hall.marker(slot.id);
              const artwork = byId[placements[slot.id]];
              return (
                <g key={slot.id} className={`admin-plan__slot${selected === slot.id ? " admin-plan__slot--selected" : ""}`} transform={`translate(${x} ${z})`} onClick={() => setSelected(slot.id)}>
                  <circle r={MARKER_RADIUS} fill={artwork ? `url(#plan-${artwork.id})` : "transparent"} className={artwork ? "admin-plan__filled" : "admin-plan__empty"} />
                  {!artwork && <text y="0.35" className="admin-plan__plus">+</text>}
                  <text y={MARKER_RADIUS + 0.85} className="admin-plan__note">{slot.name}</text>
                </g>
              );
            })}
          </svg>
          <p className="admin-muted">點地圖上的展位，再從右邊選要掛的作品。懸浮展廳會自動展出所有已發佈作品（依作品排序，最多 {MAX_PIECES} 件）。</p>
        </div>
        <aside className="admin-picker">
          <div className="admin-eyebrow">展位</div>
          <h2 className="admin-subtitle">{slotName}</h2>
          <button className="admin-button" onClick={() => assign(null)} disabled={!placements[selected]}>清空這個展位</button>
          <div className="admin-picker__grid">
            {published.map((artwork) => {
              const hungAt = Object.entries(placements).find(([, id]) => id === artwork.id)?.[0];
              return (
                <button key={artwork.id} className={`admin-pick${placements[selected] === artwork.id ? " admin-pick--active" : ""}`} onClick={() => assign(artwork.id)}>
                  <img src={artwork.previewUrl} alt="" />
                  <span>{artwork.title || "未命名"}</span>
                  {hungAt && hungAt !== selected && <em>已在{slotLabel(hungAt)}</em>}
                </button>
              );
            })}
          </div>
          {!published.length && <p className="admin-muted">還沒有已發佈的作品。草稿不會出現在畫廊裡。</p>}
        </aside>
      </div>
    </div>
  );
};

export default ExhibitionEditor;
