// Lecture — vue plein écran du titre en cours, avec la file « À suivre » en liste.
// Ouverte par le bouton plein écran natif de la barre du lecteur (détourné par lecture-core.js), fermée par Échap.

const { React } = Spicetify;
const { useState, useEffect } = React;
const h = React.createElement;

// ---------- état du lecteur ----------

function snapshot() {
  const P = Spicetify.Player;
  const data = P.data || {};
  const item = data.item;
  const next = (Spicetify.Queue?.nextTracks || [])
    .filter((t) => /^spotify:(track|episode|local):/.test(t.contextTrack?.uri || ""))
    .map((t) => {
      const m = t.contextTrack.metadata || {};
      return {
        uri: t.contextTrack.uri,
        uid: t.contextTrack.uid,
        title: m.title || "",
        artist: m.artist_name || "",
        img: m.image_url || m.image_small_url || null,
        duration: +m.duration || 0,
        queued: t.provider === "queue",
      };
    });
  return {
    item,
    title: item?.name || "",
    artists: item?.artists || [],
    album: item?.album,
    img: item?.metadata?.image_xlarge_url || item?.metadata?.image_large_url || item?.images?.at(-1)?.url || null,
    context: data.context?.metadata?.context_description || "",
    contextUri: data.context?.uri,
    playing: P.isPlaying(),
    progress: P.getProgress(),
    duration: P.getDuration(),
    shuffle: P.getShuffle(),
    repeat: P.getRepeat(),
    heart: P.getHeart(),
    next,
  };
}

function useNow() {
  const [now, setNow] = useState(snapshot);
  useEffect(() => {
    const refresh = () => setNow(snapshot());
    const timer = setInterval(refresh, 500);
    Spicetify.Player.addEventListener("songchange", refresh);
    Spicetify.Player.addEventListener("onplaypause", refresh);
    return () => {
      clearInterval(timer);
      Spicetify.Player.removeEventListener("songchange", refresh);
      Spicetify.Player.removeEventListener("onplaypause", refresh);
    };
  }, []);
  return now;
}

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function openUri(uri) {
  const path = uri && Spicetify.URI.fromString(uri)?.toURLPath?.(true);
  if (path) Spicetify.Platform.History.push(path);
}

function close() {
  const H = Spicetify.Platform.History;
  if (H.length > 1) H.goBack();
  else H.push("/accueil");
}

// ---------- icônes ----------

const svg = (d, props = {}) => h("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "currentColor", ...props }, h("path", { d }));
const I = {
  play: () => svg("M7 4.5v15l13-7.5z", { width: 26, height: 26 }),
  pause: () => svg("M6 4h4v16H6zM14 4h4v16h-4z", { width: 26, height: 26 }),
  prev: () => svg("M6 5h2v14H6zM20 5v14L9 12z"),
  next: () => svg("M16 5h2v14h-2zM4 5v14l11-7z"),
  shuffle: () => h("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    h("path", { d: "M3 6h3.5c2 0 3.2 1 4.3 2.7l2.4 3.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 18h3.5c1.4 0 2.4-.5 3.2-1.4M13.3 7.4C14.1 6.5 15.1 6 16.5 6H21M18 3l3 3-3 3M18 15l3 3-3 3" })),
  repeat: () => h("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" })),
  heart: (on) => h("svg", { viewBox: "0 0 24 24", width: 22, height: 22, fill: on ? "#1ed760" : "none", stroke: on ? "#1ed760" : "currentColor", strokeWidth: 2 },
    h("path", { d: "M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" })),
  close: () => h("svg", { viewBox: "0 0 24 24", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }, h("path", { d: "M6 6l12 12M18 6L6 18" })),
};

// ---------- composants ----------

function Progress({ now }) {
  const pct = now.duration ? Math.min(1, now.progress / now.duration) : 0;
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    Spicetify.Player.seek(Math.round(((e.clientX - r.left) / r.width) * now.duration));
  };
  return h("div", { className: "lec-progress" },
    h("span", null, fmt(now.progress)),
    h("div", { className: "lec-bar", onClick: seek }, h("div", { className: "lec-bar-fill", style: { width: `${pct * 100}%` } })),
    h("span", null, fmt(now.duration)));
}

function Controls({ now }) {
  const P = Spicetify.Player;
  const btn = (title, icon, onClick, cls = "") => h("button", { className: "lec-ctl " + cls, title, onClick }, icon);
  return h("div", { className: "lec-controls" },
    btn("Aléatoire", I.shuffle(), () => P.toggleShuffle(), now.shuffle ? "is-on" : ""),
    btn("Précédent", I.prev(), () => P.back()),
    btn(now.playing ? "Pause" : "Lecture", now.playing ? I.pause() : I.play(), () => P.togglePlay(), "is-main"),
    btn("Suivant", I.next(), () => P.next()),
    btn(now.repeat === 2 ? "Répéter le titre" : now.repeat === 1 ? "Répéter" : "Répétition désactivée", h(React.Fragment, null, I.repeat(), now.repeat === 2 && h("span", { className: "lec-one" }, "1")), () => P.toggleRepeat(), now.repeat ? "is-on" : ""),
    btn(now.heart ? "Retirer des titres likés" : "Ajouter aux titres likés", I.heart(now.heart), () => P.toggleHeart(), "is-heart"));
}

function UpNext({ now }) {
  const queued = now.next.filter((t) => t.queued);
  const rest = now.next.filter((t) => !t.queued);
  const row = (t, i) => h("div", {
    key: t.uid || t.uri + i,
    className: "lec-row",
    title: "Passer à ce titre",
    onClick: () => Spicetify.Platform.PlayerAPI.skipTo({ uri: t.uri, uid: t.uid }),
  },
    h("div", { className: "lec-row-img" }, t.img && h("img", { src: t.img, alt: "", loading: "lazy" })),
    h("div", { className: "lec-row-text" },
      h("div", { className: "lec-row-title" }, t.title),
      h("div", { className: "lec-row-artist" }, t.artist)),
    h("span", { className: "lec-row-dur" }, t.duration ? fmt(t.duration) : ""));
  return h("aside", { className: "lec-queue" },
    h("h2", null, "À suivre"),
    h("div", { className: "lec-queue-list" },
      queued.length > 0 && h(React.Fragment, null, h("div", { className: "lec-queue-label" }, "Dans ta file"), queued.map(row)),
      rest.length > 0 && h(React.Fragment, null, h("div", { className: "lec-queue-label" }, now.context ? `Ensuite depuis ${now.context}` : "Ensuite"), rest.map(row)),
      !now.next.length && h("div", { className: "lec-queue-empty" }, "Rien à suivre.")));
}

function LectureApp() {
  const now = useNow();
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("lec-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("lec-open");
    };
  }, []);

  const closeButton = h("button", { className: "lec-close", title: "Fermer (Échap)", onClick: close }, I.close());

  if (!now.item) return h("div", { className: "lec" }, h("style", null, CSS), closeButton, h("div", { className: "lec-queue-empty" }, "Rien en cours de lecture."));

  return h("div", { className: "lec" },
    h("style", null, CSS),
    now.img && h("div", { className: "lec-bg", style: { backgroundImage: `url("${now.img}")` } }),
    closeButton,
    h("main", { className: "lec-now" },
      h("div", { className: "lec-cover" }, now.img && h("img", { src: now.img, alt: "" })),
      h("div", { className: "lec-meta" },
        h("div", { className: "lec-title" }, now.title),
        h("div", { className: "lec-artists" }, now.artists.map((a, i) => h(React.Fragment, { key: a.uri || i }, i > 0 && ", ", h("a", { onClick: () => openUri(a.uri) }, a.name)))),
        h("div", { className: "lec-album" },
          now.album?.name && h("a", { onClick: () => openUri(now.album.uri) }, now.album.name),
          now.context && h(React.Fragment, null, " · ", h("a", { onClick: () => openUri(now.contextUri) }, now.context)))),
      h(Progress, { now }),
      h(Controls, { now })),
    h(UpNext, { now }));
}

function render() {
  return h(LectureApp);
}

const CSS = `
body.lec-open #global-nav-bar, body.lec-open .Root__now-playing-bar, body.lec-open .Root__right-sidebar { visibility: hidden; }
/* Les parents de la vue (transform, container-type) créent un bloc conteneur qui empêcherait
   « position: fixed » de couvrir la fenêtre : on les neutralise tant que la vue est ouverte. */
body.lec-open *:has(.lec) { transform: none !important; will-change: auto !important; container-type: normal !important; contain: none !important; filter: none !important; }
.lec { position: fixed; inset: 0; z-index: 1000; isolation: isolate; overflow: hidden; background: #0b0b0b; color: #fff;
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(340px, .75fr); gap: clamp(24px, 5vw, 96px);
  padding: clamp(28px, 5vh, 72px) clamp(24px, 5vw, 96px); }
@media (max-width: 1000px) { .lec { grid-template-columns: minmax(0, 1fr); overflow-y: auto; } }
.lec-bg { position: absolute; inset: -12%; z-index: -1; background-size: cover; background-position: center; filter: blur(70px) brightness(.42) saturate(1.3); transform: scale(1.1); transition: background-image .6s; }
/* La bande du haut (.body-drag-top, ~60 px) sert à déplacer la fenêtre et avale les clics :
   no-drag perce la zone sous la croix, et la croix est placée sous la bande par sécurité. */
.lec-close { position: absolute; top: 72px; right: 24px; width: 40px; height: 40px; border: 0; border-radius: 50%; display: grid; place-items: center; background: rgba(0,0,0,.35); color: #fff; cursor: pointer; z-index: 2; -webkit-app-region: no-drag; }
.lec-close:hover { background: rgba(0,0,0,.6); }
.lec-now { display: flex; flex-direction: column; justify-content: center; gap: 22px; min-width: 0; }
.lec-cover { width: min(56vh, 38vw, 640px); aspect-ratio: 1; border-radius: 10px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,.55); background: #222; }
@media (max-width: 1000px) { .lec-cover { width: min(70vw, 420px); } }
.lec-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lec-meta { min-width: 0; max-width: 900px; }
.lec-title { font-size: clamp(1.75rem, 3.4vw, 3.5rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.08; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lec-artists { margin-top: 8px; font-size: clamp(1rem, 1.5vw, 1.4rem); font-weight: 600; color: rgba(255,255,255,.9); }
.lec-album { margin-top: 4px; font-size: .9375rem; color: rgba(255,255,255,.62); }
.lec a { cursor: pointer; color: inherit; text-decoration: none; }
.lec a:hover { text-decoration: underline; }
.lec-progress { display: flex; align-items: center; gap: 12px; max-width: 900px; font-size: .8125rem; color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
.lec-bar { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,.2); cursor: pointer; position: relative; }
.lec-bar:hover { height: 8px; }
.lec-bar-fill { height: 100%; border-radius: inherit; background: #fff; }
.lec-controls { display: flex; align-items: center; gap: 18px; }
.lec-ctl { position: relative; width: 44px; height: 44px; border: 0; border-radius: 50%; display: grid; place-items: center; background: none; color: rgba(255,255,255,.75); cursor: pointer; }
.lec-ctl:hover { color: #fff; }
.lec-ctl.is-on { color: #1ed760; }
.lec-ctl.is-main { width: 64px; height: 64px; background: #fff; color: #000; }
.lec-ctl.is-main:hover { transform: scale(1.05); }
.lec-ctl.is-heart { margin-left: 12px; }
.lec-one { position: absolute; top: 6px; right: 6px; font-size: .625rem; font-weight: 800; }
.lec-queue { display: flex; flex-direction: column; min-height: 0; min-width: 0; padding: 18px 8px 18px 18px; border-radius: 14px; background: rgba(0,0,0,.28); backdrop-filter: blur(8px); }
.lec-queue h2 { font-size: 1.25rem; font-weight: 800; margin: 0 10px 10px 0; }
.lec-queue-list { overflow-y: auto; min-height: 0; padding-right: 10px; }
.lec-queue-label { margin: 14px 0 6px; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.55); }
.lec-queue-label:first-child { margin-top: 0; }
.lec-row { display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.lec-row:hover { background: rgba(255,255,255,.1); }
.lec-row-img { width: 44px; height: 44px; flex: none; border-radius: 4px; overflow: hidden; background: rgba(255,255,255,.08); }
.lec-row-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lec-row-text { flex: 1; min-width: 0; }
.lec-row-title { font-size: .9375rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lec-row-artist { font-size: .8125rem; color: rgba(255,255,255,.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lec-row-dur { flex: none; font-size: .8125rem; color: rgba(255,255,255,.55); font-variant-numeric: tabular-nums; }
.lec-queue-empty { color: rgba(255,255,255,.6); padding: 12px 0; }
`;
