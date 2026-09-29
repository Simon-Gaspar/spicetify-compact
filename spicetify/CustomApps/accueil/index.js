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
// Référence : des dossiers de premier niveau de la bibliothèque, un dossier = un style. Chaque artiste
// prend le style du dossier où il apparaît le plus ; le reste (albums, mix, nouveautés…) est classé
// par vote de ses artistes.
// Dossiers de style et leurs noms d'affichage. Si la bibliothèque en contient au moins un, seuls
// ceux-là comptent (les autres dossiers — humeurs, partages… — sont ignorés) ; sinon, chaque dossier
// de premier niveau est un style, sous son propre nom (capitales adoucies).
const STYLE_LABELS = {
  "ELECTRO": "Électro",
  "HIP-HOP / RAP": "Hip-hop / Rap",
  "JAZZ / BLUES": "Jazz / Blues",
  "SOUL / FUNK": "Soul / Funk",
  "INDIE / TRIP-HOP": "Indie / Trip-hop",
  "CLASSIQUE": "Classique",
};
const IGNORED_FOLDERS = new Set(["SAISONS"]); // rangement des saisons (accueil-core.js), pas un style
const MIXED = "Mixte";
const styleLabel = (name) =>
  STYLE_LABELS[name] ||
  (name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s/&-])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase()) : name);
const hasPlaylist = (f) => (f.items || []).some((i) => i.type === "playlist" || (i.type === "folder" && hasPlaylist(i)));
// Dossiers de style dans l'ordre de la bibliothèque : [{ label, folder }]
function styleFoldersOf(tree) {
  const folders = tree.items.filter((i) => i.type === "folder" && !IGNORED_FOLDERS.has(i.name) && hasPlaylist(i));
  const listed = folders.filter((f) => STYLE_LABELS[f.name]);
  return (listed.length ? listed : folders).map((folder) => ({ label: styleLabel(folder.name), folder }));
}
const STYLE_KEY = "accueil:styles";
const STYLE_TTL = 7 * 86400000;
let styleIndexPromise = null;
let styleProgress = null; // { done, total } pendant la construction de l'index
const styleListeners = new Set();
const notifyStyles = () => styleListeners.forEach((f) => f());

const warn = (where, e) => console.warn("[accueil]", where, e);

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
  const folders = styleFoldersOf(await Spicetify.Platform.RootlistAPI.getContents({}));
  const styles = folders.map((f) => f.label);
  const playlists = {};
  const walk = (items, style) => {
    for (const i of items) {
      if (i.type === "folder") walk(i.items || [], style);
      else if (i.type === "playlist") playlists[i.uri] = style;
    }
  };
  for (const { label, folder } of folders) walk(folder.items || [], label);

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
    artists[a] = styles.indexOf(best);
  }
  const idx = { v: 2, at: Date.now(), styles, playlists, artists, items: {} };
  lsSet(STYLE_KEY, idx);
  styleProgress = null;
  notifyStyles();
  return idx;
}

function getStyleIndex() {
  if (!styleIndexPromise) {
    const cached = lsGet(STYLE_KEY);
    // v2 : styles lus dans la bibliothèque (index v1 : liste figée, à reconstruire)
    styleIndexPromise = cached?.v === 2 && Date.now() - cached.at < STYLE_TTL ? Promise.resolve(cached) : buildStyleIndex();
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
  return n / known >= 0.4 ? idx.styles[best] : MIXED;
}

let styleSaveTimer;
async function styleOf(card, idx) {
  if (idx.playlists[card.uri]) return idx.playlists[card.uri];
  if (idx.items[card.uri]) return idx.items[card.uri];
  let style = MIXED;
  if (card.uri.startsWith("spotify:artist:")) style = idx.artists[card.uri] !== undefined ? idx.styles[idx.artists[card.uri]] : MIXED;
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
  { id: "later", label: "Plus tard" },
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

// Dates de sortie : absentes de la bibliothèque, lues dans les métadonnées de chaque album
// (spclient metadata/4), puis gardées en cache local : elles ne changent pas.
const DATES_KEY = "accueil:albumDates";
const albumDates = lsGet(DATES_KEY) || {};
let datesSaveTimer;

async function spMeta(kind, id) {
  const token = Spicetify.Platform.AuthorizationAPI.getState().token.accessToken;
  const r = await fetch(`https://spclient.wg.spotify.com/metadata/4/${kind}/${Spicetify.URI.idToHex(id)}?market=from_token`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!r.ok) throw new Error(`métadonnées ${kind} : HTTP ${r.status}`);
  return r.json();
}

function useAlbumDates(albums, enabled) {
  const [, rerender] = useState(0);
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    if (!enabled || !albums?.length) return;
    const missing = albums.filter((a) => !(a.uri in albumDates));
    if (!missing.length) return;
    let alive = true, done = 0;
    setProgress({ done, total: missing.length });
    pool(missing, 6, async (a) => {
      try {
        const d = (await spMeta("album", a.uri.split(":")[2])).date || {};
        albumDates[a.uri] = d.year ? `${d.year}-${String(d.month || 1).padStart(2, "0")}-${String(d.day || 1).padStart(2, "0")}` : "";
      } catch (e) { warn("date de sortie", e); }
      done += 1;
      if (alive && done % 12 === 0) { setProgress({ done, total: missing.length }); rerender((x) => x + 1); }
    }).then(() => {
      lsSet(DATES_KEY, albumDates);
      if (alive) { setProgress(null); rerender((x) => x + 1); }
    });
    return () => { alive = false; };
  }, [albums, enabled]);
  return progress;
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
const notify = (msg, isError) => Spicetify.showNotification?.(msg, isError);
const errMsg = (e) => e?.message || String(e);
const titles = (n) => (n > 1 ? `${n} titres` : "Titre");

// ---------- glisser-déposer ----------
// Spotify met les URI des titres glissés dans text/x-spotify-tracks (plusieurs si sélection
// multiple) ; text/uri-list (liens open.spotify.com) en secours.
const DRAG_TYPES = ["text/x-spotify-tracks", "text/uri-list"];
const toUri = (s) => {
  const m = s.match(/open\.spotify\.com\/(track|episode)\/([A-Za-z0-9]+)/);
  return m ? `spotify:${m[1]}:${m[2]}` : s.trim();
};
function draggedUris(dt) {
  const raw = dt.getData("text/x-spotify-tracks") || dt.getData("text/uri-list") || "";
  return [...new Set(raw.split(/[\s,]+/).map(toUri).filter((u) => /^spotify:(track|episode):/.test(u)))];
}

// Props de cible de dépôt + état « survolé ». accept(uris) reçoit les titres lâchés.
function useDrop(accept) {
  const [over, setOver] = useState(false);
  const ok = (e) => DRAG_TYPES.some((t) => e.dataTransfer.types.includes(t));
  return [over, {
    onDragOver: (e) => { if (!ok(e)) return; e.preventDefault(); if (!over) setOver(true); },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); },
    onDrop: (e) => {
      if (!ok(e)) return;
      e.preventDefault();
      setOver(false);
      const uris = draggedUris(e.dataTransfer);
      if (uris.length) accept(uris);
    },
  }];
}

// Ajoute en fin de playlist, sans doublons.
async function addToPlaylist(pl, uris) {
  const P = Spicetify.Platform.PlaylistAPI;
  try {
    const have = new Set(((await P.getContents(pl.uri)).items || []).map((i) => i.uri));
    const fresh = uris.filter((u) => !have.has(u));
    if (!fresh.length) return notify(`Déjà dans ${pl.name}`);
    await P.add(pl.uri, fresh, { after: "end" });
    notify(`${titles(fresh.length)} ajouté${fresh.length > 1 ? "s" : ""} à ${pl.name}`);
  } catch (e) {
    notify("Ajout impossible : " + errMsg(e), true);
  }
}

async function likeTracks(uris) {
  const L = Spicetify.Platform.LibraryAPI;
  const tracks = uris.filter((u) => u.startsWith("spotify:track:"));
  if (!tracks.length) return notify("Seuls les titres peuvent être likés", true);
  try {
    const liked = await L.contains(...tracks);
    const fresh = tracks.filter((u, i) => !liked[i]);
    if (!fresh.length) return notify(tracks.length > 1 ? "Déjà dans les titres likés" : "Déjà liké");
    await L.add({ uris: fresh });
    notify(`${titles(fresh.length)} ajouté${fresh.length > 1 ? "s" : ""} aux titres likés`);
  } catch (e) {
    notify("Like impossible : " + errMsg(e), true);
  }
}

// ---------- santé ----------
// API internes manquantes (vérifiées par accueil-core.js) : une mise à jour de Spotify les a
// renommées ou retirées, certaines fonctions ne marchent plus.
function HealthBanner() {
  const [missing, setMissing] = useState(() => window.AccueilCore?.missing || []);
  useEffect(() => {
    const refresh = () => setMissing(window.AccueilCore?.missing || []);
    window.addEventListener("accueil:health", refresh);
    return () => window.removeEventListener("accueil:health", refresh);
  }, []);
  if (!missing.length) return null;
  return h("div", { className: "acc-alert" },
    h("strong", null, "Spotify a changé une partie de ses API internes."),
    ` Certaines fonctions peuvent ne plus marcher (${missing.join(", ")}). Mets à jour le thème depuis `,
    h("a", { href: "https://github.com/Simon-Gaspar/spicetify-compact" }, "github.com/Simon-Gaspar/spicetify-compact"),
    ", ou attends une mise à jour de Spicetify.");
}

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
  return { styles, progress: styleProgress, names: idx?.styles || [] };
}

// Dossiers de style de la bibliothèque, par libellé (« Électro » → dossier ELECTRO)
let styleFoldersPromise = null;
const getStyleFolders = () =>
  (styleFoldersPromise ||= Spicetify.Platform.RootlistAPI.getContents({}).then((t) =>
    Object.fromEntries(styleFoldersOf(t).map(({ label, folder }) => [label, folder]))));

// Filtre par style ; le ▶ de chaque style lance tout le dossier correspondant en aléatoire.
function StyleBar({ items, styles, names, progress, value, onChange }) {
  const [folders, setFolders] = useState({});
  const [busy, setBusy] = useState(null);
  useEffect(() => { getStyleFolders().then(setFolders, (e) => warn("dossiers de style", e)); }, []);
  if (progress) return h("div", { className: "acc-hint" }, `Analyse des styles de ta bibliothèque… ${progress.done}/${progress.total} playlists (une seule fois)`);
  const counts = {};
  for (const c of items) {
    const st = styles[c.uri];
    if (st) counts[st] = (counts[st] || 0) + 1;
  }
  const options = [...names, MIXED].filter((st) => counts[st]);
  if (!names.length || !options.length) return null; // aucun dossier de style dans la bibliothèque
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
// Les playlists à soi acceptent qu'on y dépose des titres.
function Tile({ card, showOwner }) {
  const tip = card.name + (showOwner && card.baseSub ? ` — ${card.baseSub}` : "") + (card.n ? ` · ${card.n} écoute${card.n > 1 ? "s" : ""}` : "");
  const [over, drop] = useDrop((uris) => addToPlaylist(card, uris));
  return h("div", { className: "acc-tile" + (over ? " is-drop" : ""), onClick: () => openUri(card.uri), title: tip, ...(card.group === "self" ? drop : {}) },
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
  const { styles, progress, names } = useStyles(state.data);
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
        h(StyleBar, { items: sorted, styles, names, progress, value: style, onChange: setStyle }),
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
  { id: "release", label: "Sortie ↓", title: "Date de sortie, les plus récents d'abord" },
  { id: "release-asc", label: "Sortie ↑", title: "Date de sortie, les plus anciens d'abord" },
];

function MyAlbums() {
  const state = useAsync(fetchAlbums, []);
  const [sort, setSort] = useState("recent");
  const [style, setStyle] = useState("all");
  const plays = usePlays();
  const { styles, progress, names } = useStyles(state.data);
  const byRelease = sort.startsWith("release");
  const datesProgress = useAlbumDates(state.data, byRelease);
  const sorted = useMemo(() => {
    let list = withPlays(state.data || [], plays);
    if (byRelease) {
      list = list.map((a) => ({ ...a, date: albumDates[a.uri] || "", sub: (albumDates[a.uri] ? albumDates[a.uri].slice(0, 4) + " · " : "") + a.sub }));
      const dir = sort === "release" ? -1 : 1;
      return list.sort((a, b) => (!a.date) - (!b.date) || dir * a.date.localeCompare(b.date) || byName(a, b));
    }
    if (sort === "top") return list.sort((a, b) => b.n - a.n || byRecent(a, b));
    if (sort === "added") return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (sort === "az") return list.sort(byName);
    if (sort === "artist") return list.sort((a, b) => a.artist.localeCompare(b.artist, "fr", { sensitivity: "base" }) || byName(a, b));
    return list.sort(byRecent);
  }, [state.data, sort, plays, datesProgress]);
  const shown = sorted.filter(byStyle(style, styles));
  return h(Status, { state }, () =>
    h("section", { className: "acc-section" },
      h(Toolbar, null,
        h(StyleBar, { items: sorted, styles, names, progress, value: style, onChange: setStyle }),
        h(Sorts, { options: ALBUM_SORTS, value: sort, onChange: setSort })),
      datesProgress && h("div", { className: "acc-hint acc-note" }, `Lecture des dates de sortie… ${datesProgress.done}/${datesProgress.total} (une seule fois)`),
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
  const { styles, progress, names } = useStyles(all);
  const [style, setStyle] = useState("all");
  const keep = byStyle(style, styles);
  const filtered = sections.map((s) => ({ ...s, items: s.items.filter(keep) })).filter((s) => s.items.length);
  return h(React.Fragment, null,
    h(Toolbar, null, h(StyleBar, { items: all, styles, names, progress, value: style, onChange: setStyle })),
    filtered.length ? filtered.map((s) => h(Section, { key: s.title + style, title: s.title, items: s.items, limit })) : h("div", { className: "acc-empty" }, "Rien dans ce style ici."));
}

function LikedHero() {
  const [over, drop] = useDrop(likeTracks);
  return h("div", { className: "acc-liked" + (over ? " is-drop" : ""), onClick: () => Spicetify.Platform.History.push("/collection/tracks"), ...drop },
    h("div", { className: "acc-liked-art" }, h("svg", { viewBox: "0 0 24 24", width: 28, height: 28, fill: "#fff" }, h("path", { d: "M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" }))),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, "Titres likés"),
      h("div", { className: "acc-sub" }, over ? "Lâcher pour liker" : "Lecture ou aléatoire")),
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
  const [over, drop] = useDrop((uris) => addToPlaylist(pl, uris));
  if (!pl) return null;
  const img = pl.images?.[0]?.url;
  return h("div", { className: "acc-liked" + (over ? " is-drop" : ""), onClick: () => openUri(pl.uri), ...drop },
    h("div", { className: "acc-liked-art is-season" }, img ? h("img", { src: img, alt: "" }) : null),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, pl.name),
      h("div", { className: "acc-sub" }, over ? "Lâcher pour ajouter" : "Saison en cours")),
    h("button", { className: "acc-round", title: "Lire", onClick: (e) => { e.stopPropagation(); play(pl.uri); } }, h(PlayIcon)));
}

// ---------- plus tard ----------
// Liste tenue par l'extension accueil-core.js (menu clic droit « Écouter plus tard »).
const LATER_KINDS = [
  { id: "all", label: "Tout" },
  { id: "track", label: "Titres" },
  { id: "album", label: "Albums" },
  { id: "playlist", label: "Playlists" },
  { id: "artist", label: "Artistes" },
];

function useLater() {
  const read = () => window.AccueilCore?.readLater?.() || lsGet("accueil:later") || [];
  const [list, setList] = useState(read);
  useEffect(() => {
    const refresh = () => setList(read());
    window.addEventListener("accueil:later", refresh);
    return () => window.removeEventListener("accueil:later", refresh);
  }, []);
  return list;
}

async function playTracks(uris) {
  if (!uris.length) return;
  try {
    await Spicetify.Player.playUri(uris[0]);
    if (uris.length > 1) await Spicetify.Platform.PlayerAPI.addToQueue(uris.slice(1).map((uri) => ({ uri })));
  } catch (e) { notify("Lecture impossible : " + errMsg(e), true); }
}

function LaterCard({ item }) {
  const remove = (e) => { e.stopPropagation(); window.AccueilCore?.removeLater?.([item.uri]); };
  return h("div", { className: "acc-card" + (item.played ? " is-played" : ""), onClick: () => openUri(item.uri), title: item.name },
    h("div", { className: "acc-cover" + (item.round ? " is-round" : "") },
      item.img ? h("img", { src: item.img, loading: "lazy", alt: "", draggable: false }) : h("div", { className: "acc-ph" }),
      item.played && h("span", { className: "acc-badge" }, "Écouté"),
      h("button", { className: "acc-remove", title: "Retirer de « Plus tard »", onClick: remove }, "×"),
      h("button", { className: "acc-play", "aria-label": "Lire " + item.name, onClick: (e) => { e.stopPropagation(); play(item.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-name" }, item.name),
    h("div", { className: "acc-sub" }, [LATER_KINDS.find((k) => k.id === item.kind)?.label.replace(/s$/, ""), item.sub].filter(Boolean).join(" · ")));
}

function Later() {
  const list = useLater();
  const [kind, setKind] = useState("all");
  const shown = list.filter((i) => kind === "all" || i.kind === kind);
  const tracks = shown.filter((i) => i.kind === "track" && !i.played).map((i) => i.uri);
  const played = list.filter((i) => i.played).map((i) => i.uri);
  if (!list.length) return h("div", { className: "acc-empty" }, "Rien pour l'instant. Clic droit sur un titre, un album, une playlist ou un artiste → « Écouter plus tard ».");
  return h("section", { className: "acc-section" },
    h(Toolbar, null,
      h("div", { className: "acc-styles" },
        LATER_KINDS.map((k) => {
          const n = k.id === "all" ? list.length : list.filter((i) => i.kind === k.id).length;
          return n > 0 && h("button", { key: k.id, className: "acc-schip" + (kind === k.id ? " is-on" : ""), onClick: () => setKind(k.id) }, k.label, h("span", { className: "acc-chip-n" }, n));
        })),
      h("div", { className: "acc-sorts" },
        tracks.length > 0 && h("button", { className: "acc-sort", onClick: () => playTracks(tracks) }, `▶ Lire les titres (${tracks.length})`),
        played.length > 0 && h("button", { className: "acc-sort", onClick: () => window.AccueilCore?.removeLater?.(played) }, `Retirer les écoutés (${played.length})`))),
    h("div", { className: "acc-grid" }, shown.map((i) => h(LaterCard, { key: i.uri, item: i }))));
}

// ---------- discographie ----------
// Page /accueil/discographie/<id>, ouverte depuis le menu clic droit « Discographie complète ».
const RELEASE_TYPES = { ALBUM: "Albums", EP: "EP", SINGLE: "Singles", COMPILATION: "Compilations" };
const RELEASE_ONE = { ALBUM: "Album", EP: "EP", SINGLE: "Single", COMPILATION: "Compilation" };

async function fetchDiscography(id) {
  const G = Spicetify.GraphQL;
  const uri = `spotify:artist:${id}`;
  const releases = [];
  for (let offset = 0; ; offset += 50) {
    const r = await G.Request(G.Definitions.queryArtistDiscographyAll, { uri, offset, limit: 50, order: "DATE_DESC" });
    const all = r?.data?.artistUnion?.discography?.all;
    if (!all) throw new Error("discographie introuvable");
    for (const it of all.items || []) {
      const rel = it.releases?.items?.[0];
      if (!rel) continue;
      releases.push({
        uri: `spotify:album:${rel.id}`,
        name: rel.name,
        img: pickImage(rel.coverArt?.sources),
        type: rel.type,
        date: rel.date?.isoString?.slice(0, 10) || String(rel.date?.year || ""),
        tracks: rel.tracks?.totalCount || 0,
      });
    }
    if (offset + 50 >= (all.totalCount || 0)) break;
  }
  let name = "", avatar = null;
  try {
    const o = await G.Request(G.Definitions.queryArtistOverview, { uri, locale: "", includePrerelease: false });
    name = o?.data?.artistUnion?.profile?.name || "";
    avatar = pickImage(o?.data?.artistUnion?.visuals?.avatarImage?.sources);
  } catch (e) { warn("discographie : profil", e); }
  let saved = [];
  try { saved = await Spicetify.Platform.LibraryAPI.contains(...releases.map((r) => r.uri)); } catch (e) { warn("discographie : bibliothèque", e); }
  releases.forEach((r, i) => { r.saved = !!saved[i]; });
  return { uri, name, avatar, releases };
}

const DISCO_SORTS = [
  { id: "new", label: "Récentes" },
  { id: "old", label: "Anciennes" },
  { id: "az", label: "A → Z" },
];

function Discography({ id }) {
  const state = useAsync(() => fetchDiscography(id), [id]);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("new");
  return h(Status, { state }, () => {
    const d = state.data;
    const count = (t) => d.releases.filter((r) => (t === "saved" ? r.saved : r.type === t)).length;
    const keep = (r) => type === "all" || (type === "saved" ? r.saved : r.type === type);
    const list = d.releases.filter(keep).sort((a, b) =>
      sort === "az" ? byName(a, b) : (sort === "old" ? 1 : -1) * a.date.localeCompare(b.date));
    const cards = list.map((r) => ({ ...r, sub: [r.date.slice(0, 4), RELEASE_ONE[r.type] || "", r.tracks ? `${r.tracks} titre${r.tracks > 1 ? "s" : ""}` : "", r.saved ? "✓ dans ta bibliothèque" : ""].filter(Boolean).join(" · ") }));
    const chip = (t, label, n) => n > 0 && h("button", { key: t, className: "acc-schip" + (type === t ? " is-on" : ""), onClick: () => setType(t) }, label, h("span", { className: "acc-chip-n" }, n));
    return h("section", { className: "acc-section" },
      h("div", { className: "acc-disco-head" },
        d.avatar && h("img", { className: "acc-disco-avatar", src: d.avatar, alt: "" }),
        h("div", null,
          h("div", { className: "acc-disco-kicker" }, "Discographie complète"),
          h("h1", { className: "acc-disco-name" }, d.name || "Artiste"),
          h("div", { className: "acc-sub" }, `${d.releases.length} sorties · `, h("a", { className: "acc-link", onClick: () => openUri(d.uri) }, "page de l'artiste")))),
      h(Toolbar, null,
        h("div", { className: "acc-styles" },
          chip("all", "Tout", d.releases.length),
          Object.entries(RELEASE_TYPES).map(([t, label]) => chip(t, label, count(t))),
          chip("saved", "Dans ta bibliothèque", count("saved"))),
        h(Sorts, { options: DISCO_SORTS, value: sort, onChange: setSort })),
      h(Grid, { items: cards }));
  });
}

function usePath() {
  const H = Spicetify.Platform.History;
  const [path, setPath] = useState(H.location.pathname);
  useEffect(() => H.listen((arg) => setPath((arg?.location ?? arg).pathname)), []);
  return path;
}

// « Your All-Time Top Songs » (playlist générée par Spotify), épinglée à côté de la saison.
const TOP_RE = /all[- ]time top songs|de tous les temps/i;

function TopHero() {
  const [pl, setPl] = useState(null);
  useEffect(() => {
    Spicetify.Platform.LibraryAPI.getContents({ filters: ["2"], flattenTree: true, limit: 400 })
      .then((r) => setPl((r.items || []).find((i) => i.type === "playlist" && TOP_RE.test(i.name || "")) || null), () => {});
  }, []);
  if (!pl) return null;
  const img = pl.images?.[0]?.url;
  return h("div", { className: "acc-liked", onClick: () => openUri(pl.uri) },
    h("div", { className: "acc-liked-art" }, img ? h("img", { src: img, alt: "" }) : null),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, "All-Time Top"),
      h("div", { className: "acc-sub" }, "Tes titres de toujours")),
    h("button", { className: "acc-round", title: "Lire", onClick: (e) => { e.stopPropagation(); play(pl.uri); } }, h(PlayIcon)));
}

function AccueilApp() {
  const [main, setMain] = useState("music");
  const [sub, setSub] = useState({ music: "playlists", podcasts: "episodes" });
  const tabs = main === "music" ? MUSIC_TABS : PODCAST_TABS;
  const tab = tabs.find((t) => t.id === sub[main]);
  useEffect(() => { fetchHome("music-chip").catch(() => {}); }, []);
  const path = usePath();
  const later = useLater();

  const disco = path.match(/^\/accueil\/discographie\/([A-Za-z0-9]+)/);
  if (disco) {
    return h("div", { className: "acc-page" },
      h("style", null, CSS),
      h("button", { className: "acc-link acc-back", onClick: () => Spicetify.Platform.History.goBack() }, "← Retour"),
      h(Discography, { key: disco[1], id: disco[1] }));
  }

  let body;
  if (main === "music" && tab.id === "playlists") body = h(MyPlaylists);
  else if (main === "music" && tab.id === "later") body = h(Later);
  else if (main === "music" && tab.id === "albums") body = h(MyAlbums);
  else body = h(HomeSections, { key: main + tab.id, facet: main === "music" ? "music-chip" : "podcasts-chip", tab, tabs });

  return h("div", { className: "acc-page" },
    h("style", null, CSS),
    h(HealthBanner),
    h("header", { className: "acc-header" },
      h("nav", { className: "acc-main-tabs" },
        [["music", "Musique"], ["podcasts", "Podcasts"]].map(([id, label]) =>
          h("button", { key: id, className: "acc-main-tab" + (main === id ? " is-on" : ""), onClick: () => setMain(id) }, label))),
      h("div", { className: "acc-heroes" }, h(TopHero), h(SeasonHero), h(LikedHero))),
    h("nav", { className: "acc-subnav" },
      tabs.map((t) => h("button", { key: t.id, className: "acc-chip" + (t.id === tab.id ? " is-on" : ""), onClick: () => setSub({ ...sub, [main]: t.id }) },
        t.label, t.id === "later" && later.length > 0 && h("span", { className: "acc-chip-n" }, later.length)))),
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
.acc-col-head { display: flex; align-items: baseline; gap: 8px; padding: 0 2px 10px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,.08); }
.acc-col-head h2 { font-size: 1.125rem; font-weight: 700; margin: 0; }
.acc-count { color: var(--acc-sub); font-size: .8125rem; }
.acc-col-more { margin: 10px 2px 0; }
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
.acc-schip-label:first-child { padding-left: 12px; }
.acc-chip-n { margin-left: 6px; color: var(--acc-sub); font-variant-numeric: tabular-nums; }
.acc-schip.is-on .acc-chip-n { color: rgba(0,0,0,.55); }
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
.acc-note { margin: -8px 0 16px; }
.acc-card.is-played .acc-cover img { opacity: .55; }
.acc-badge { position: absolute; left: 8px; top: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,.75); color: #fff; font-size: .6875rem; font-weight: 700; }
.acc-remove { position: absolute; right: 6px; top: 6px; width: 26px; height: 26px; border: 0; border-radius: 50%; background: rgba(0,0,0,.7); color: #fff; font-size: 1rem; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .12s; }
.acc-card:hover .acc-remove, .acc-remove:focus-visible { opacity: 1; }
.acc-back { display: inline-block; margin-bottom: 18px; font-size: .875rem; }
.acc-disco-head { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
.acc-disco-avatar { width: 112px; height: 112px; border-radius: 50%; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
.acc-disco-kicker { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--acc-sub); }
.acc-disco-name { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; letter-spacing: -.02em; margin: 2px 0 6px; }
.acc-empty { color: var(--acc-sub); padding: 40px 0; }
.acc-liked.is-drop { background: var(--acc-chip-hover); box-shadow: inset 0 0 0 2px var(--acc-green); }
.acc-tile.is-drop .acc-tile-img::after { content: ""; position: absolute; inset: 0; border: 3px solid var(--acc-green); border-radius: inherit; pointer-events: none; }
.acc-tile.is-drop .acc-tile-img img { filter: brightness(.6); }
.acc-alert { margin-bottom: 20px; padding: 12px 16px; border-radius: 8px; background: rgba(245,158,11,.14); color: #fcd9a0; font-size: .875rem; line-height: 1.45; }
.acc-alert a { color: inherit; text-decoration: underline; }
.acc-more { display: flex; justify-content: center; margin-top: 16px; }
`;
