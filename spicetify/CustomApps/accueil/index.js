// Accueil — page d'accueil sur mesure (custom app Spicetify)
// Deux onglets (Musique / Podcasts), un sous-menu chacun, et les titres likés en un clic.
// Données : requête GraphQL « home » de Spotify, filtrée par section ; bibliothèque via LibraryAPI.

const { React } = Spicetify;
const { useState, useEffect, useMemo } = React;
const h = React.createElement;

const PLAYS_KEY = "accueil:plays"; // alimenté par l'extension accueil-core.js
const CACHE_MS = 5 * 60 * 1000;
const cache = {};

// ---------- styles ----------
// Référence : les dossiers de genre de la bibliothèque. Chaque artiste prend le style du dossier
// où il apparaît le plus ; le reste (albums, mix, nouveautés…) est classé par vote de ses artistes.
const STYLE_FOLDERS = {
  "ELECTRO": "Électro",
  "HIP-HOP / RAP": "Hip-hop / Rap",
  "JAZZ / BLUES": "Jazz / Blues",
  "SOUL / FUNK": "Soul / Funk",
  "INDIE / TRIP-HOP": "Indie / Trip-hop",
  "CLASSIQUE": "Classique",
};
const STYLES = Object.values(STYLE_FOLDERS);
const MIXED = "Mixte";
const STYLE_KEY = "accueil:styles";
const STYLE_TTL = 7 * 86400000;
let styleIndexPromise = null;
let styleProgress = null; // { done, total } pendant la construction de l'index
const styleListeners = new Set();
const notifyStyles = () => styleListeners.forEach((f) => f());

function lsGet(key) {
  try { return JSON.parse(Spicetify.LocalStorage.get(key) || "null"); } catch { return null; }
}
function lsSet(key, value) {
  try { Spicetify.LocalStorage.set(key, JSON.stringify(value)); } catch {}
}

async function pool(items, size, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try { await fn(item); } catch {}
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
}

async function trackArtists(uri, limit) {
  const r = await Spicetify.Platform.PlaylistAPI.getContents(uri, { limit });
  return (r.items || []).flatMap((t) => (t.artists || []).map((a) => a.uri)).filter(Boolean);
}

async function buildStyleIndex() {
  const tree = await Spicetify.Platform.RootlistAPI.getContents({});
  const playlists = {};
  const walk = (items, style) => {
    for (const i of items) {
      if (i.type === "folder") walk(i.items || [], style);
      else if (i.type === "playlist") playlists[i.uri] = style;
    }
  };
  for (const f of tree.items) if (f.type === "folder" && STYLE_FOLDERS[f.name]) walk(f.items || [], STYLE_FOLDERS[f.name]);

  const votes = {};
  const uris = Object.keys(playlists);
  styleProgress = { done: 0, total: uris.length };
  notifyStyles();
  await pool(uris, 6, async (uri) => {
    const style = playlists[uri];
    try {
      for (const a of await trackArtists(uri, 150)) {
        const v = (votes[a] ||= {});
        v[style] = (v[style] || 0) + 1;
      }
    } finally {
      styleProgress.done += 1;
      if (styleProgress.done % 8 === 0) notifyStyles();
    }
  });

  const artists = {};
  for (const [a, v] of Object.entries(votes)) {
    const best = Object.entries(v).sort((x, y) => y[1] - x[1])[0][0];
    artists[a] = STYLES.indexOf(best);
  }
  const idx = { at: Date.now(), playlists, artists, items: {} };
  lsSet(STYLE_KEY, idx);
  styleProgress = null;
  notifyStyles();
  return idx;
}

function getStyleIndex() {
  if (!styleIndexPromise) {
    const cached = lsGet(STYLE_KEY);
    styleIndexPromise = cached && Date.now() - cached.at < STYLE_TTL ? Promise.resolve(cached) : buildStyleIndex();
    styleIndexPromise.catch(() => { styleIndexPromise = null; styleProgress = null; notifyStyles(); });
  }
  return styleIndexPromise;
}

function voteStyle(artistUris, idx) {
  const count = {};
  let known = 0;
  for (const a of artistUris) {
    const s = idx.artists[a];
    if (s === undefined) continue;
    known += 1;
    count[s] = (count[s] || 0) + 1;
  }
  if (!known || (artistUris.length > 3 && known < 3)) return MIXED;
  const [best, n] = Object.entries(count).sort((x, y) => y[1] - x[1])[0];
  return n / known >= 0.4 ? STYLES[best] : MIXED;
}

let styleSaveTimer;
async function styleOf(card, idx) {
  if (idx.playlists[card.uri]) return idx.playlists[card.uri];
  if (idx.items[card.uri]) return idx.items[card.uri];
  let style = MIXED;
  if (card.uri.startsWith("spotify:artist:")) style = idx.artists[card.uri] !== undefined ? STYLES[idx.artists[card.uri]] : MIXED;
  else if (card.artistUris?.length) style = voteStyle(card.artistUris, idx);
  else if (card.uri.startsWith("spotify:playlist:")) style = voteStyle(await trackArtists(card.uri, 60), idx);
  idx.items[card.uri] = style;
  clearTimeout(styleSaveTimer);
  styleSaveTimer = setTimeout(() => lsSet(STYLE_KEY, idx), 2000);
  return style;
}

// Sections de l'accueil Spotify → sous-menus. L'ordre compte : première règle qui matche.
const MUSIC_TABS = [
  { id: "playlists", label: "Mes playlists" },
  { id: "albums", label: "Mes albums" },
  { id: "mix", label: "Mix pour moi", match: /^(Made [Ff]or|Your top mixes|Recommended [Ss]tations|Daily Mix)/ },
  { id: "new", label: "Nouveautés", match: /(New releases|new music|Release Radar|Nouveaut|Sorties)/i },
  { id: "discover", label: "Découvrir", match: /(More like|For fans of|Based on your|Picked for you|Recommended|Playlists de|Discover|Similar)/i },
];
const PODCAST_TABS = [
  { id: "episodes", label: "Nouveaux épisodes", match: /^New episode/i, merge: "Derniers épisodes de tes émissions" },
  { id: "resume", label: "Reprendre", match: /^Catch up/i, merge: "À reprendre" },
  { id: "shows", label: "Mes podcasts", match: /^Your shows/i },
  { id: "discover", label: "Découvrir", match: /(might like|Similar to|Popular with)/i, exclude: /Video/i },
];

const TITLES = [
  [/^Made For .+/, "Conçu pour toi"],
  [/^Made for you$/, "Pour toi"],
  [/^Your top mixes$/, "Tes mix préférés"],
  [/^Recommended Stations$/, "Radios recommandées"],
  [/^New releases for you$/, "Nouvelles sorties pour toi"],
  [/^Top picks in new music$/, "Sélection de nouveautés"],
  [/^More like (.+)$/, "Dans le style de $1"],
  [/^For fans of (.+)$/, "Pour les fans de $1"],
  [/^Based on your recent listening$/, "D'après tes écoutes récentes"],
  [/^Picked for you$/, "Choisi pour toi"],
  [/^Recommended for today$/, "Recommandé pour aujourd'hui"],
  [/^Your shows$/, "Tes émissions"],
  [/^Episodes you might like$/, "Épisodes qui pourraient te plaire"],
  [/^Shows you might like$/, "Émissions qui pourraient te plaire"],
  [/^Similar to your interests$/, "Proche de tes centres d'intérêt"],
  [/^Popular with listeners of (.+)$/, "Populaire chez les auditeurs de $1"],
];
const frTitle = (t) => {
  for (const [re, fr] of TITLES) if (re.test(t)) return t.replace(re, fr);
  return t;
};

// ---------- données ----------

function findSources(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 7) return null;
  if (Array.isArray(o.sources) && o.sources[0]?.url) return o.sources;
  const preferred = ["images", "coverArt", "visuals", "avatarImage", "squareCoverImage"];
  const keys = [...preferred.filter((k) => k in o), ...Object.keys(o).filter((k) => !preferred.includes(k) && k !== "ownerV2")];
  for (const k of keys) {
    const r = findSources(o[k], depth + 1);
    if (r) return r;
  }
  return null;
}

function pickImage(sources) {
  if (!sources?.length) return null;
  const sized = sources.filter((s) => s.width);
  if (!sized.length) return sources[0].url;
  return sized.reduce((best, s) => (Math.abs(s.width - 300) < Math.abs(best.width - 300) ? s : best)).url;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.round((Date.now() - d) / 86400000);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function toCard(data) {
  if (!data?.uri || !data.name) return null;
  const type = data.__typename;
  const img = pickImage(findSources(data));
  switch (type) {
    case "Playlist":
      return { uri: data.uri, name: data.name, img, sub: data.ownerV2?.data?.name || "Playlist" };
    case "Album":
      return { uri: data.uri, name: data.name, img, sub: (data.artists?.items || []).map((a) => a.profile?.name).filter(Boolean).join(", ") || "Album", artistUris: (data.artists?.items || []).map((a) => a.uri).filter(Boolean) };
    case "Artist":
      return { uri: data.uri, name: data.profile?.name || data.name, img, sub: "Artiste", round: true };
    case "Episode": {
      const show = data.podcastV2?.data?.name;
      const date = formatDate(data.releaseDate?.isoString);
      return { uri: data.uri, name: data.name, img, sub: [date, show].filter(Boolean).join(" · "), date: data.releaseDate?.isoString };
    }
    case "Podcast":
      return { uri: data.uri, name: data.name, img, sub: data.publisher?.name || "Podcast" };
    default:
      return null;
  }
}

function fetchHome(facet) {
  const hit = cache[facet];
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = requestHome(facet);
  cache[facet] = { at: Date.now(), promise };
  promise.catch(() => delete cache[facet]);
  return promise;
}

async function requestHome(facet) {
  const G = Spicetify.GraphQL;
  const res = await G.Request(G.Definitions.home, {
    homeEndUserIntegration: "INTEGRATION_DESKTOP",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sp_t: "",
    facet,
    sectionItemsLimit: 20,
    includeEpisodeContentRatingsV2: false,
  });
  const sections = (res?.data?.home?.sectionContainer?.sections?.items || [])
    .map((s) => ({
      title: s.data?.title?.transformedLabel || "",
      items: (s.sectionItems?.items || []).map((i) => toCard(i.content?.data)).filter(Boolean),
    }))
    .filter((s) => s.title && s.items.length);
  return sections;
}

// Regroupe les sections d'un sous-menu : fusionne les titres identiques, dédoublonne les éléments.
function sectionsFor(tab, allTabs, sections) {
  const owner = (title) => allTabs.find((t) => t.match && t.match.test(title) && !(t.exclude && t.exclude.test(title)));
  const mine = sections.filter((s) => owner(s.title) === tab);
  const groups = new Map();
  for (const s of mine) {
    const title = tab.merge || frTitle(s.title);
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(...s.items);
  }
  return [...groups].map(([title, items]) => {
    const seen = new Set();
    let unique = items.filter((i) => !seen.has(i.uri) && seen.add(i.uri));
    if (tab.merge && unique.some((i) => i.date)) unique = unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return { title, items: unique };
  });
}

function readPlays() {
  try { return JSON.parse(Spicetify.LocalStorage.get(PLAYS_KEY) || "{}"); } catch { return {}; }
}

async function fetchPlaylists() {
  const L = Spicetify.Platform.LibraryAPI;
  const all = [];
  for (let offset = 0; ; ) {
    const r = await L.getContents({ filters: ["2"], sortOrder: L.getRecentsSortOrderId?.() ?? "6", flattenTree: true, limit: 200, offset });
    const items = r.items || [];
    all.push(...items);
    offset += items.length;
    if (!items.length || offset >= r.totalLength) break;
  }
  return all
    .filter((i) => i.type === "playlist")
    .map((i) => ({
      uri: i.uri,
      name: i.name,
      img: i.images?.[0]?.url || null,
      baseSub: i.isOwnedBySelf ? "Toi" : i.owner?.name || i.madeForName || "Playlist",
      group: i.isOwnedBySelf ? "self" : i.owner?.uri === "spotify:user:spotify" ? "spotify" : "others",
      lastPlayedAt: i.lastPlayedAt || "",
    }));
}

async function fetchAlbums() {
  const L = Spicetify.Platform.LibraryAPI;
  const all = [];
  for (let offset = 0; ; ) {
    const r = await L.getContents({ filters: ["0"], sortOrder: L.getRecentsSortOrderId?.() ?? "6", limit: 200, offset });
    const items = r.items || [];
    all.push(...items);
    offset += items.length;
    if (!items.length || offset >= r.totalLength) break;
  }
  return all
    .filter((i) => i.type === "album")
    .map((i) => {
      const artist = (i.artists || []).map((a) => a.name).join(", ");
      return { uri: i.uri, name: i.name, img: i.images?.[0]?.url || null, baseSub: artist, artist, artistUris: (i.artists || []).map((a) => a.uri), lastPlayedAt: i.lastPlayedAt || "", addedAt: i.addedAt || "" };
    });
}

// ---------- actions ----------

async function play(uri, shuffle) {
  try {
    if (shuffle !== undefined) await Spicetify.Player.setShuffle(shuffle);
    await Spicetify.Player.playUri(uri);
  } catch (e) {
    Spicetify.showNotification?.("Lecture impossible : " + (e?.message || e), true);
  }
}

function openUri(uri) {
  const path = Spicetify.URI.fromString(uri)?.toURLPath?.(true);
  if (path) Spicetify.Platform.History.push(path);
}

const likedUri = () => `spotify:user:${Spicetify.Platform.username}:collection`;

// ---------- composants ----------

const PlayIcon = () => h("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "currentColor" }, h("path", { d: "M7 4.5v15l13-7.5z" }));
const ShuffleIcon = () =>
  h("svg", { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    h("path", { d: "M3 6h3.5c2 0 3.2 1 4.3 2.7l2.4 3.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 18h3.5c1.4 0 2.4-.5 3.2-1.4M13.3 7.4C14.1 6.5 15.1 6 16.5 6H21M18 3l3 3-3 3M18 15l3 3-3 3" }));

function Card({ card }) {
  return h("div", { className: "acc-card", onClick: () => openUri(card.uri), title: card.name },
    h("div", { className: "acc-cover" + (card.round ? " is-round" : "") },
      card.img ? h("img", { src: card.img, loading: "lazy", alt: "", draggable: false }) : h("div", { className: "acc-ph" }),
      h("button", { className: "acc-play", "aria-label": "Lire " + card.name, onClick: (e) => { e.stopPropagation(); play(card.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-name" }, card.name),
    card.sub && h("div", { className: "acc-sub" }, card.sub));
}

function Grid({ items }) {
  return h("div", { className: "acc-grid" }, items.map((c) => h(Card, { key: c.uri, card: c })));
}

function Section({ title, items, limit }) {
  const [open, setOpen] = useState(false);
  const shown = open || !limit ? items : items.slice(0, limit);
  return h("section", { className: "acc-section" },
    h("div", { className: "acc-section-head" },
      h("h2", null, title),
      limit && items.length > limit && h("button", { className: "acc-link", onClick: () => setOpen(!open) }, open ? "Réduire" : `Tout afficher (${items.length})`)),
    h(Grid, { items: shown }));
}

function useAsync(fn, deps) {
  const [state, setState] = useState({ loading: true });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data }), (error) => alive && setState({ error }));
    return () => { alive = false; };
  }, [...deps, nonce]);
  return { ...state, retry: () => setNonce((n) => n + 1) };
}

function Status({ state, children }) {
  if (state.error) return h("div", { className: "acc-empty" }, "Impossible de charger : " + (state.error.message || state.error), " ", h("button", { className: "acc-link", onClick: state.retry }, "Réessayer"));
  if (state.loading && !state.data) return h("div", { className: "acc-empty" }, "Chargement…");
  return children();
}

function usePlays() {
  const [plays, setPlays] = useState(readPlays);
  useEffect(() => {
    const refresh = () => setPlays(readPlays());
    window.addEventListener("accueil:plays", refresh);
    return () => window.removeEventListener("accueil:plays", refresh);
  }, []);
  return plays;
}

const playsLabel = (n) => (n ? ` · ${n} écoute${n > 1 ? "s" : ""}` : "");
const withPlays = (items, plays) => items.map((c) => ({ ...c, n: plays[c.uri]?.n || 0, sub: c.baseSub + playsLabel(plays[c.uri]?.n) }));

function useStyles(items) {
  const [idx, setIdx] = useState(null);
  const [styles, setStyles] = useState({});
  const [, rerender] = useState(0);
  useEffect(() => {
    const onChange = () => rerender((x) => x + 1);
    styleListeners.add(onChange);
    getStyleIndex().then(setIdx, () => {});
    return () => styleListeners.delete(onChange);
  }, []);
  useEffect(() => {
    if (!idx || !items?.length) return;
    let alive = true;
    const found = {};
    let flushTimer;
    const flush = () => alive && setStyles((m) => ({ ...m, ...found }));
    pool(items, 4, async (c) => {
      found[c.uri] = await styleOf(c, idx);
      clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 150);
    }).then(flush);
    return () => { alive = false; };
  }, [idx, items]);
  return { styles, progress: styleProgress };
}

// Dossiers de style de la bibliothèque, par libellé (« Électro » → dossier ELECTRO)
let styleFoldersPromise = null;
const getStyleFolders = () =>
  (styleFoldersPromise ||= Spicetify.Platform.RootlistAPI.getContents({}).then((t) =>
    Object.fromEntries(t.items.filter((i) => i.type === "folder" && STYLE_FOLDERS[i.name]).map((f) => [STYLE_FOLDERS[f.name], f]))));

// Filtre par style ; le ▶ de chaque style lance tout le dossier correspondant en aléatoire.
function StyleBar({ items, styles, progress, value, onChange }) {
  const [folders, setFolders] = useState({});
  const [busy, setBusy] = useState(null);
  useEffect(() => { getStyleFolders().then(setFolders, () => {}); }, []);
  if (progress) return h("div", { className: "acc-hint" }, `Analyse des styles de ta bibliothèque… ${progress.done}/${progress.total} playlists (une seule fois)`);
  const counts = {};
  for (const c of items) {
    const st = styles[c.uri];
    if (st) counts[st] = (counts[st] || 0) + 1;
  }
  const options = [...STYLES, MIXED].filter((st) => counts[st]);
  if (!options.length) return null;
  const launch = async (st) => {
    setBusy(st);
    try { await playFolder(folders[st]); } catch (e) { Spicetify.showNotification?.("Lecture impossible : " + (e?.message || e), true); }
    setBusy(null);
  };
  return h("div", { className: "acc-styles" },
    h("button", { className: "acc-schip" + (value === "all" ? " is-on" : ""), onClick: () => onChange("all") }, "Tous", h("span", { className: "acc-chip-n" }, items.length)),
    options.map((st) => h("span", { key: st, className: "acc-schip" + (value === st ? " is-on" : "") },
      folders[st] && h("button", { className: "acc-schip-play", title: `Lancer tout ${st} en aléatoire`, disabled: !!busy, onClick: () => launch(st) }, busy === st ? "…" : h(PlayIcon)),
      h("button", { className: "acc-schip-label", onClick: () => onChange(st) }, st, h("span", { className: "acc-chip-n" }, counts[st])))));
}

function Toolbar({ children }) {
  return h("div", { className: "acc-toolbar" }, children);
}

const byStyle = (style, styles) => (c) => style === "all" || styles[c.uri] === style;

const byRecent = (a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt);
const byName = (a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" });

function Sorts({ options, value, onChange }) {
  return h("div", { className: "acc-sorts" },
    options.map((o) => h("button", { key: o.id, className: "acc-sort" + (value === o.id ? " is-on" : ""), title: o.title, onClick: () => onChange(o.id) }, o.label)));
}

const PLAYLIST_SORTS = [
  { id: "top", label: "Plus écoutées" },
  { id: "recent", label: "Récentes" },
  { id: "az", label: "A → Z" },
];
const COLUMNS = [
  { id: "self", label: "Mes playlists" },
  { id: "others", label: "Playlists des autres" },
  { id: "spotify", label: "Playlists Spotify" },
];

// Vignette compacte pour les colonnes de playlists : grille dense, nom sous la pochette.
function Tile({ card, showOwner }) {
  const tip = card.name + (showOwner && card.baseSub ? ` — ${card.baseSub}` : "") + (card.n ? ` · ${card.n} écoute${card.n > 1 ? "s" : ""}` : "");
  return h("div", { className: "acc-tile", onClick: () => openUri(card.uri), title: tip },
    h("div", { className: "acc-tile-img" },
      card.img ? h("img", { src: card.img, loading: "lazy", alt: "", draggable: false }) : null,
      card.n > 0 && h("span", { className: "acc-tile-n" }, card.n),
      h("button", { className: "acc-tile-play", "aria-label": "Lire " + card.name, onClick: (e) => { e.stopPropagation(); play(card.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-tile-name" }, card.name));
}

function Column({ id, label, items }) {
  const [n, setN] = useState(60);
  return h("div", { className: "acc-col" },
    h("div", { className: "acc-col-head" }, h("h2", null, label), h("span", { className: "acc-count" }, items.length)),
    items.length
      ? h("div", { className: "acc-tiles" }, items.slice(0, n).map((c) => h(Tile, { key: c.uri, card: c, showOwner: id === "others" })))
      : h("div", { className: "acc-sub" }, "Aucune playlist"),
    items.length > n && h("button", { className: "acc-link acc-col-more", onClick: () => setN(n + 120) }, `Afficher plus (${items.length - n})`));
}

function MyPlaylists() {
  const state = useAsync(fetchPlaylists, []);
  const [sort, setSort] = useState("top");
  const [style, setStyle] = useState("all");
  const plays = usePlays();
  const { styles, progress } = useStyles(state.data);
  const sorted = useMemo(() => {
    const list = withPlays(state.data || [], plays);
    if (sort === "az") return list.sort(byName);
    if (sort === "recent") return list.sort(byRecent);
    return list.sort((a, b) => b.n - a.n || byRecent(a, b));
  }, [state.data, sort, plays]);
  const shown = sorted.filter(byStyle(style, styles));
  const since = plays._since ? new Date(plays._since).toLocaleDateString("fr-FR") : null;
  const sorts = PLAYLIST_SORTS.map((o) => (o.id === "top" ? { ...o, title: since ? `Écoutes comptées depuis le ${since}, tous appareils (une écoute = un lancement), puis par écoute récente` : "Par écoute récente, en attendant le nombre d'écoutes" } : o));

  return h(Status, { state }, () =>
    h("section", { className: "acc-section" },
      h(Toolbar, null,
        h(StyleBar, { items: sorted, styles, progress, value: style, onChange: setStyle }),
        h(Sorts, { options: sorts, value: sort, onChange: setSort })),
      h("div", { className: "acc-cols" },
        COLUMNS.map((c) => h(Column, { key: c.id + sort + style, id: c.id, label: c.label, items: shown.filter((p) => p.group === c.id) })))));
}

const ALBUM_SORTS = [
  { id: "top", label: "Plus écoutés" },
  { id: "recent", label: "Récents" },
  { id: "added", label: "Ajoutés" },
  { id: "az", label: "A → Z" },
  { id: "artist", label: "Artiste" },
];

function MyAlbums() {
  const state = useAsync(fetchAlbums, []);
  const [sort, setSort] = useState("recent");
  const [style, setStyle] = useState("all");
  const plays = usePlays();
  const { styles, progress } = useStyles(state.data);
  const sorted = useMemo(() => {
    const list = withPlays(state.data || [], plays);
    if (sort === "top") return list.sort((a, b) => b.n - a.n || byRecent(a, b));
    if (sort === "added") return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (sort === "az") return list.sort(byName);
    if (sort === "artist") return list.sort((a, b) => a.artist.localeCompare(b.artist, "fr", { sensitivity: "base" }) || byName(a, b));
    return list.sort(byRecent);
  }, [state.data, sort, plays]);
  const shown = sorted.filter(byStyle(style, styles));
  return h(Status, { state }, () =>
    h("section", { className: "acc-section" },
      h(Toolbar, null,
        h(StyleBar, { items: sorted, styles, progress, value: style, onChange: setStyle }),
        h(Sorts, { options: ALBUM_SORTS, value: sort, onChange: setSort })),
      h(SectionlessGrid, { key: sort + style, items: shown })));
}

function SectionlessGrid({ items }) {
  const [n, setN] = useState(48);
  return h(React.Fragment, null,
    h(Grid, { items: items.slice(0, n) }),
    items.length > n && h("div", { className: "acc-more" }, h("button", { className: "acc-chip", onClick: () => setN(n + 96) }, `Afficher plus (${items.length - n} restants)`)));
}

function HomeSections({ facet, tab, tabs }) {
  const state = useAsync(() => fetchHome(facet), [facet]);
  const sections = useMemo(() => (state.data ? sectionsFor(tab, tabs, state.data) : []), [state.data]);
  return h(Status, { state }, () =>
    !sections.length
      ? h("div", { className: "acc-empty" }, "Rien à afficher ici pour le moment.")
      : facet === "music-chip"
        ? h(StyledSections, { sections, limit: tab.merge ? 24 : 12 })
        : h(React.Fragment, null, sections.map((s) => h(Section, { key: s.title, title: s.title, items: s.items, limit: tab.merge ? 24 : 12 }))));
}

function StyledSections({ sections, limit }) {
  const all = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const { styles, progress } = useStyles(all);
  const [style, setStyle] = useState("all");
  const keep = byStyle(style, styles);
  const filtered = sections.map((s) => ({ ...s, items: s.items.filter(keep) })).filter((s) => s.items.length);
  return h(React.Fragment, null,
    h(Toolbar, null, h(StyleBar, { items: all, styles, progress, value: style, onChange: setStyle })),
    filtered.length ? filtered.map((s) => h(Section, { key: s.title + style, title: s.title, items: s.items, limit })) : h("div", { className: "acc-empty" }, "Rien dans ce style ici."));
}

function LikedHero() {
  return h("div", { className: "acc-liked", onClick: () => Spicetify.Platform.History.push("/collection/tracks") },
    h("div", { className: "acc-liked-art" }, h("svg", { viewBox: "0 0 24 24", width: 28, height: 28, fill: "#fff" }, h("path", { d: "M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" }))),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, "Titres likés"),
      h("div", { className: "acc-sub" }, "Lecture ou aléatoire")),
    h("button", { className: "acc-round is-ghost", title: "Lecture aléatoire", onClick: (e) => { e.stopPropagation(); play(likedUri(), true); } }, h(ShuffleIcon)),
    h("button", { className: "acc-round", title: "Lire", onClick: (e) => { e.stopPropagation(); play(likedUri(), false); } }, h(PlayIcon)));
}

// Lance tout un dossier de style en aléatoire. Le lecteur ne sait pas lire un dossier par son
// URI seule : on lui fournit la liste des titres, avec le dossier comme contexte.
async function playFolder(folder) {
  const P = Spicetify.Platform;
  const lists = [];
  (function walk(items) {
    for (const i of items) {
      if (i.type === "playlist") lists.push(i.uri);
      if (i.items) walk(i.items);
    }
  })(folder.items || []);
  const uris = new Set();
  await pool(lists, 6, async (uri) => {
    const r = await P.PlaylistAPI.getContents(uri, { limit: 300 });
    for (const t of r.items || []) if (t.uri?.startsWith("spotify:track:")) uris.add(t.uri);
  });
  const list = [...uris];
  if (!list.length) throw new Error("dossier vide");
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  await P.PlayerAPI.play({ uri: folder.uri, pages: [{ items: list.slice(0, 1000).map((uri) => ({ uri, type: "track" })) }] }, { featureIdentifier: "accueil" }, {});
}

// Saison en cours : nom calculé par l'extension (window.AccueilCore), qui crée aussi la playlist.
function SeasonHero() {
  const [pl, setPl] = useState(null);
  useEffect(() => {
    const load = () => {
      const core = window.AccueilCore;
      if (!core) return;
      const name = core.currentSeason();
      Spicetify.Platform.LibraryAPI.getContents({ filters: ["2"], flattenTree: true, limit: 400 })
        .then((r) => setPl((r.items || []).find((i) => i.type === "playlist" && core.normName(i.name || "") === core.normName(name)) || null), () => {});
    };
    load();
    window.addEventListener("accueil:season", load);
    return () => window.removeEventListener("accueil:season", load);
  }, []);
  if (!pl) return null;
  const img = pl.images?.[0]?.url;
  return h("div", { className: "acc-liked", onClick: () => openUri(pl.uri) },
    h("div", { className: "acc-liked-art is-season" }, img ? h("img", { src: img, alt: "" }) : null),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, pl.name),
      h("div", { className: "acc-sub" }, "Saison en cours")),
    h("button", { className: "acc-round", title: "Lire", onClick: (e) => { e.stopPropagation(); play(pl.uri); } }, h(PlayIcon)));
}

function AccueilApp() {
  const [main, setMain] = useState("music");
  const [sub, setSub] = useState({ music: "playlists", podcasts: "episodes" });
  const tabs = main === "music" ? MUSIC_TABS : PODCAST_TABS;
  const tab = tabs.find((t) => t.id === sub[main]);
  useEffect(() => { fetchHome("music-chip").catch(() => {}); }, []);

  let body;
  if (main === "music" && tab.id === "playlists") body = h(MyPlaylists);
  else if (main === "music" && tab.id === "albums") body = h(MyAlbums);
  else body = h(HomeSections, { key: main + tab.id, facet: main === "music" ? "music-chip" : "podcasts-chip", tab, tabs });

  return h("div", { className: "acc-page" },
    h("style", null, CSS),
    h("header", { className: "acc-header" },
      h("nav", { className: "acc-main-tabs" },
        [["music", "Musique"], ["podcasts", "Podcasts"]].map(([id, label]) =>
          h("button", { key: id, className: "acc-main-tab" + (main === id ? " is-on" : ""), onClick: () => setMain(id) }, label))),
      h("div", { className: "acc-heroes" }, h(SeasonHero), h(LikedHero))),
    h("nav", { className: "acc-subnav" },
      tabs.map((t) => h("button", { key: t.id, className: "acc-chip" + (t.id === tab.id ? " is-on" : ""), onClick: () => setSub({ ...sub, [main]: t.id }) }, t.label))),
    body);
}

function render() {
  return h(AccueilApp);
}

const CSS = `
.acc-page { --acc-green: #1ed760; --acc-text: #fff; --acc-sub: #b3b3b3; --acc-chip: rgba(255,255,255,.07); --acc-chip-hover: rgba(255,255,255,.12);
  padding: 24px clamp(16px, 2vw, 40px) 48px; color: var(--acc-text); }
.acc-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 20px; }
.acc-main-tabs { display: flex; gap: 28px; }
.acc-main-tab { background: none; border: 0; padding: 4px 0; color: var(--acc-sub); font-size: 2rem; font-weight: 700; letter-spacing: -.02em; cursor: pointer; border-bottom: 3px solid transparent; }
.acc-main-tab:hover { color: var(--acc-text); }
.acc-main-tab.is-on { color: var(--acc-text); border-bottom-color: var(--acc-green); }
.acc-liked { display: flex; align-items: center; gap: 14px; padding: 8px 10px 8px 8px; min-width: 320px; border-radius: 8px; background: var(--acc-chip); cursor: pointer; }
.acc-liked:hover { background: var(--acc-chip-hover); }
.acc-liked-art { width: 56px; height: 56px; flex: none; border-radius: 4px; display: grid; place-items: center; background: linear-gradient(135deg, #450af5, #c4efd9); }
.acc-liked-text { flex: 1; min-width: 0; }
.acc-liked-title { font-weight: 700; font-size: 1rem; }
.acc-round { width: 44px; height: 44px; flex: none; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--acc-green); color: #000; cursor: pointer; transition: transform .1s; }
.acc-round:hover { transform: scale(1.06); }
.acc-round.is-ghost { background: transparent; color: var(--acc-sub); }
.acc-round.is-ghost:hover { color: var(--acc-text); }
.acc-subnav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
.acc-chip { border: 0; border-radius: 999px; padding: 8px 16px; background: var(--acc-chip); color: var(--acc-text); font-size: .875rem; cursor: pointer; }
.acc-chip:hover { background: var(--acc-chip-hover); }
.acc-chip.is-on { background: var(--acc-text); color: #000; }
.acc-chip.is-small { padding: 5px 12px; font-size: .8125rem; }
.acc-section { margin-bottom: 36px; }
.acc-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.acc-section-head h2 { font-size: 1.375rem; font-weight: 700; margin: 0; }
.acc-sorts { display: flex; gap: 6px; }
.acc-hint { color: var(--acc-sub); font-size: .8125rem; }
.acc-link { background: none; border: 0; color: var(--acc-sub); font-size: .8125rem; font-weight: 700; cursor: pointer; padding: 0; }
.acc-link:hover { color: var(--acc-text); text-decoration: underline; }
.acc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(164px, 1fr)); gap: 8px 4px; }
.acc-card { padding: 10px; border-radius: 6px; cursor: pointer; min-width: 0; }
.acc-card:hover { background: var(--acc-chip); }
.acc-cover { position: relative; aspect-ratio: 1; margin-bottom: 8px; border-radius: 6px; overflow: hidden; background: #282828; box-shadow: 0 8px 24px rgba(0,0,0,.35); }
.acc-cover.is-round { border-radius: 50%; }
.acc-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.acc-ph { width: 100%; height: 100%; }
.acc-play { position: absolute; right: 8px; bottom: 8px; width: 44px; height: 44px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--acc-green); color: #000; cursor: pointer; opacity: 0; transform: translateY(6px); transition: opacity .15s, transform .15s; box-shadow: 0 8px 16px rgba(0,0,0,.4); }
.acc-card:hover .acc-play, .acc-play:focus-visible { opacity: 1; transform: none; }
.acc-name { font-size: .9375rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-sub { color: var(--acc-sub); font-size: .8125rem; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.acc-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 40px clamp(32px, 4vw, 72px); align-items: start; }
.acc-col { min-width: 0; }
.acc-col-head { display: flex; align-items: baseline; gap: 8px; padding: 0 8px 10px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,.08); }
.acc-col-head h2 { font-size: 1.125rem; font-weight: 700; margin: 0; }
.acc-count { color: var(--acc-sub); font-size: .8125rem; }
.acc-col-more { margin: 10px 8px 0; }
.acc-heroes { display: flex; gap: 12px; flex-wrap: wrap; }
.acc-liked-art.is-season { background: linear-gradient(135deg, #b3541e, #f2c14e); overflow: hidden; }
.acc-liked-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.acc-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px 24px; flex-wrap: wrap; margin-bottom: 18px; }
.acc-styles { display: flex; flex-wrap: wrap; gap: 6px; }
.acc-schip { display: inline-flex; align-items: center; border: 0; border-radius: 999px; background: var(--acc-chip); color: var(--acc-text); font-size: .8125rem; padding: 0; cursor: pointer; }
button.acc-schip { padding: 5px 12px; }
.acc-schip:hover { background: var(--acc-chip-hover); }
.acc-schip.is-on { background: var(--acc-text); color: #000; }
.acc-schip-label { background: none; border: 0; color: inherit; font: inherit; padding: 5px 12px 5px 6px; cursor: pointer; }
.acc-schip-play { width: 22px; height: 22px; margin-left: 3px; border: 0; border-radius: 50%; display: grid; place-items: center; background: transparent; color: var(--acc-sub); cursor: pointer; font-size: .7rem; }
.acc-schip-play svg { width: 11px; height: 11px; }
.acc-schip:hover .acc-schip-play, .acc-schip-play:focus-visible { background: var(--acc-green); color: #000; }
.acc-schip.is-on .acc-schip-play { color: #000; }
.acc-schip-play:disabled { opacity: .5; cursor: default; }
.acc-sort { background: none; border: 0; padding: 4px 8px; color: var(--acc-sub); font-size: .8125rem; cursor: pointer; border-radius: 4px; }
.acc-sort:hover { color: var(--acc-text); }
.acc-sort.is-on { color: var(--acc-text); font-weight: 700; }
.acc-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 16px 12px; padding: 6px 2px 0; }
.acc-tile { min-width: 0; cursor: pointer; }
.acc-tile-img { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #282828; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
.acc-tile-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.acc-tile:hover .acc-tile-img img { filter: brightness(.7); }
.acc-tile-n { position: absolute; left: 5px; bottom: 5px; min-width: 18px; padding: 1px 6px; border-radius: 999px; background: rgba(0,0,0,.75); color: #fff; font-size: .6875rem; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
.acc-tile-play { position: absolute; right: 6px; bottom: 6px; width: 32px; height: 32px; border: 0; border-radius: 50%; display: grid; place-items: center; background: var(--acc-green); color: #000; opacity: 0; transform: translateY(3px); transition: opacity .12s, transform .12s; cursor: pointer; }
.acc-tile-play svg { width: 14px; height: 14px; }
.acc-tile:hover .acc-tile-play, .acc-tile-play:focus-visible { opacity: 1; transform: none; }
.acc-tile-name { margin-top: 7px; font-size: .8125rem; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.acc-empty { color: var(--acc-sub); padding: 40px 0; }
.acc-more { display: flex; justify-content: center; margin-top: 16px; }
`;
