// Accueil — page d'accueil sur mesure (custom app Spicetify)
// Deux onglets (Musique / Podcasts), un sous-menu chacun, et les titres likés en un clic.
// Données : requête GraphQL « home » de Spotify, filtrée par section ; bibliothèque via LibraryAPI.

const { React } = Spicetify;
const { useState, useEffect, useMemo } = React;
const h = React.createElement;

// ---------- langue ----------
// tr() et pas t() : Spicetify emballe la custom app dans un module webpack (e, t, n) où t est
// l'objet des exports ; une fonction t au premier niveau l'écraserait et la page ne s'afficherait plus.
// Français si Spotify est en français, anglais sinon ; accueil:lang ("fr" | "en") force une langue.
// Les textes sont écrits en français dans le code ; tr() renvoie la traduction anglaise (EN) si besoin,
// et le texte tel quel s'il n'est pas traduit.
const LANG = (() => {
  try { const forced = Spicetify.LocalStorage.get("accueil:lang"); if (forced === "fr" || forced === "en") return forced; } catch {}
  return String(Spicetify.Locale?.getLocale?.() || navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
})();
const LOCALE = LANG === "fr" ? "fr-FR" : "en-US";
const EN = {
  "Musique": "Music",
  "Podcasts & livres": "Podcasts & books",
  "Mes playlists": "My playlists",
  "Mes albums": "My albums",
  "Plus tard": "Later",
  "Mix pour moi": "Mixes for me",
  "Nouveautés": "New releases",
  "Découvrir": "Discover",
  "Nouveaux épisodes": "New episodes",
  "Reprendre": "Resume",
  "Mes podcasts": "My shows",
  "Livres audio": "Audiobooks",
  "Derniers épisodes de tes émissions": "Latest episodes from your shows",
  "À reprendre": "Pick up where you left off",
  "Mes livres audio": "My audiobooks",
  "Aucun livre audio dans ta bibliothèque : en voici quelques-uns pour toi.": "No audiobooks in your library yet — here are a few for you.",
  "Playlists des autres": "Other people's playlists",
  "Playlists Spotify": "Spotify playlists",
  "Aucune playlist": "No playlists",
  "Artiste": "Artist",
  "Livre audio": "Audiobook",
  "Émission": "Show",
  "Dossier": "Folder",
  "Toi": "You",
  "Ta playlist": "Your playlist",
  "Épisode": "Episode",
  "Saison en cours": "Current season",
  "Tes titres de toujours": "Your all-time favorites",
  "Tes épisodes": "Your episodes",
  "Épisodes enregistrés": "Saved episodes",
  "Titres likés": "Liked Songs",
  "Lecture ou aléatoire": "Play or shuffle",
  "Lecture aléatoire": "Shuffle",
  "Lire": "Play",
  "Lire ": "Play ",
  "Lâcher pour ajouter": "Drop to add",
  "Lâcher pour liker": "Drop to like",
  "Titres likés — glisser pour réorganiser": "Liked Songs — drag to reorder",
  "Retirer de l'accueil": "Unpin from home",
  "Épingle une playlist": "Pin a playlist",
  "Clic droit → Épingler sur l'accueil": "Right-click → Pin to home",
  "Clic droit sur une playlist, un album, un artiste ou un dossier → « Épingler sur l'accueil »": "Right-click a playlist, album, artist or folder → “Pin to home”",
  "Clic droit sur une émission ou un livre audio → « Épingler sur l'accueil » pour le retrouver ici.": "Right-click a show or audiobook → “Pin to home” to keep it here.",
  "Tout": "All",
  "Titres": "Tracks",
  "Artistes": "Artists",
  "Écouté": "Played",
  "Retirer de « Plus tard »": "Remove from Later",
  "Rien pour l'instant. Clic droit sur un titre, un album, une playlist ou un artiste → « Écouter plus tard ».": "Nothing yet. Right-click a track, album, playlist or artist → “Listen later”.",
  "Plus écoutées": "Most played",
  "Récentes": "Recent",
  "Plus écoutés": "Most played",
  "Récents": "Recent",
  "Ajoutés": "Added",
  "Sortie ↓": "Release ↓",
  "Sortie ↑": "Release ↑",
  "Date de sortie, les plus récents d'abord": "Release date, newest first",
  "Date de sortie, les plus anciens d'abord": "Release date, oldest first",
  "Anciennes": "Oldest",
  "Ranger": "Tidy up",
  "Playlists mal rangées, en vrac ou en sommeil": "Misfiled, loose or dormant playlists",
  "Par écoute récente, en attendant le nombre d'écoutes": "By recent plays, until play counts build up",
  "Discographie complète": "Full discography",
  "Dans ta bibliothèque": "In your library",
  "✓ dans ta bibliothèque": "✓ in your library",
  "page de l'artiste": "artist page",
  "← Retour": "← Back",
  "Albums": "Albums",
  "Singles": "Singles",
  "Compilations": "Compilations",
  "Compilation": "Compilation",
  "discographie introuvable": "discography not found",
  "Suggestions de rangement": "Tidy-up suggestions",
  "Actualiser": "Refresh",
  "Fermer": "Close",
  "Mal rangées": "Misfiled",
  "En vrac": "Loose",
  "Pas écoutées depuis plus d'un an": "Not played in over a year",
  "Archiver": "Archive",
  "Ignorer": "Dismiss",
  "Rien à ranger : ta bibliothèque est en ordre.": "Nothing to tidy: your library is in order.",
  "Analyse impossible : ": "Analysis failed: ",
  "Rangement impossible : ": "Couldn't move: ",
  "Rien à afficher ici pour le moment.": "Nothing to show here yet.",
  "Rien dans ce style ici.": "Nothing in this style here.",
  "Mixte": "Mixed",
  "Lecture impossible : ": "Can't play: ",
  "Aujourd'hui": "Today",
  "Hier": "Yesterday",
  "Titre": "Track",
  "Ajout impossible : ": "Couldn't add: ",
  "Astuce : range tes playlists dans des dossiers (Électro, Rap, Jazz…) pour filtrer et lancer par style.": "Tip: sort your playlists into folders (Electronic, Rap, Jazz…) to filter and play by style.",
  "Impossible de charger : ": "Couldn't load: ",
  "Réessayer": "Retry",
  "Chargement…": "Loading…",
  "Réduire": "Show less",
  "Il y a {n} j": "{n} d ago",
  "{n} titres": "{n} tracks",
  "Déjà dans {name}": "Already in {name}",
  "{n} titre ajouté à {name}": "{n} track added to {name}",
  "{n} titres ajoutés à {name}": "{n} tracks added to {name}",
  "{n} titre ajouté aux titres likés": "{n} track added to Liked Songs",
  "{n} titres ajoutés aux titres likés": "{n} tracks added to Liked Songs",
  " · {n} écoute": " · {n} play",
  " · {n} écoutes": " · {n} plays",
  "Rangée dans {from}, mais {pct} de ses artistes ({known} reconnus sur {total}) relèvent de {to}": "Filed in {from}, but {pct} of its artists ({known} of {total} recognized) belong to {to}",
  "À la racine ; {pct} de ses artistes ({known} reconnus sur {total}) relèvent de {to}": "At the root; {pct} of its artists ({known} of {total} recognized) belong to {to}",
  "Dernière écoute : {date}": "Last played: {date}",
  "Écoutes comptées depuis le {since}, tous appareils (une écoute = un lancement), puis par écoute récente": "Plays counted since {since}, all devices (one play = one start), then by recent plays",
  "{n} titre": "{n} track",
  "{name} — glisser pour réorganiser": "{name} — drag to reorder",
  "Tout afficher ({n})": "Show all ({n})",
  "Afficher plus ({n})": "Show more ({n})",
  "Afficher plus ({n} restants)": "Show more ({n} left)",
  "Analyse des styles de ta bibliothèque… {done}/{total} playlists (une seule fois)": "Analyzing your library's styles… {done}/{total} playlists (one time only)",
  "Lancer tout {style} en aléatoire": "Shuffle all of {style}",
  "« {name} » rangée dans {label}": "“{name}” moved to {label}",
  "Déplacer vers {label}": "Move to {label}",
  "Analyse de ta bibliothèque… {done}/{total} playlists": "Analyzing your library… {done}/{total} playlists",
  "« {name} » archivée dans {folder}": "“{name}” archived in {folder}",
  "Spotify ne garde pas de date d'écoute pour {n} playlist : celles qui dorment ne peuvent pas toutes être repérées.": "Spotify keeps no play date for {n} playlist, so dormant ones can't all be spotted.",
  "Spotify ne garde pas de date d'écoute pour {n} playlists : celles qui dorment ne peuvent pas toutes être repérées.": "Spotify keeps no play date for {n} playlists, so dormant ones can't all be spotted.",
  "Lecture des dates de sortie… {done}/{total} (une seule fois)": "Reading release dates… {done}/{total} (one time only)",
  "▶ Lire les titres ({n})": "▶ Play tracks ({n})",
  "Retirer les écoutés ({n})": "Remove played ({n})",
  "{n} sorties · ": "{n} releases · ",
  "Spotify a changé une partie de ses API internes.": "Spotify changed some of its internal APIs.",
  " Certaines fonctions peuvent ne plus marcher ({list}). Mets à jour le thème depuis ": " Some features may stop working ({list}). Update the theme from ",
  ", ou attends une mise à jour de Spicetify.": ", or wait for a Spicetify update.",
  "Seuls les titres peuvent être likés": "Only tracks can be liked",
  "Déjà dans les titres likés": "Already in Liked Songs",
  "Déjà liké": "Already liked",
  "Tous": "All",
  "Nouvelle version du thème : {latest}": "New theme version: {latest}",
  " (installée : {current}). ": " (installed: {current}). ",
  "Récupère la dernière version sur ": "Get the latest version on ",
  " et relance le script d'installation. ": " and run the install script again. "
};
function tr(fr, vars) {
  let text = LANG === "en" && EN[fr] !== undefined ? EN[fr] : fr;
  if (vars) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return text;
}

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

// Sections de l'accueil Spotify → sous-menus, d'après leur titre, qui dépend de la langue de Spotify
// (règles en anglais et en français). L'ordre compte : première règle qui matche. Un onglet
// « fallback » récupère les sections qu'aucune règle ne reconnaît (autre langue, nouveau type de
// section), sauf celles de SKIP_SECTIONS : rien ne disparaît.
const SKIP_SECTIONS = /^(Recents|Récents|Récemment|Jump back in|Reprends|Shorts)|Vid[ée]os?\b|HomeShorts/i;
const MUSIC_TABS = [
  { id: "playlists", label: tr("Mes playlists") },
  { id: "albums", label: tr("Mes albums") },
  { id: "later", label: tr("Plus tard") },
  { id: "mix", label: tr("Mix pour moi"), match: /^(Made [Ff]or|Your top mixes|Recommended [Ss]tations|Daily Mix|Conçu pour|Créé pour|Tes mix|Vos mix|Mix préférés|Radios? recommandées)/i },
  { id: "new", label: tr("Nouveautés"), match: /(New releases|new music|Release Radar|Nouveaut|Sorties|Radar des sorties)/i },
  { id: "discover", label: tr("Découvrir"), fallback: true, match: /(More like|For fans of|Based on your|Picked for you|Recommended|Playlists de|Discover|Similar|Plus du genre|Dans le style|Pour les fans|Sur la base|Choisi pour|Recommandé|Découv|Similaire)/i },
];
const PODCAST_TABS = [
  { id: "episodes", label: tr("Nouveaux épisodes"), match: /^(New episode|Nouvel épisode|Nouveaux épisodes)/i, merge: tr("Derniers épisodes de tes émissions") },
  { id: "resume", label: tr("Reprendre"), match: /^(Catch up|Remettez-vous à jour|Rattrape|À rattraper|Reprendre)/i, merge: tr("À reprendre") },
  { id: "shows", label: tr("Mes podcasts"), match: /^(Your shows|Vos émissions|Tes émissions)/i },
  { id: "books", label: tr("Livres audio") },
  { id: "discover", label: tr("Découvrir"), fallback: true, match: /(might like|Similar to|Popular with|pourriez aimer|pourraient vous plaire|pourrait te plaire|Similaire à|Populaire chez)/i },
];
// Sections de la facette livres audio : toutes rangées sous « Livres audio » de l'onglet Podcasts.
const AUDIOBOOK_TABS = [{ id: "books", label: tr("Livres audio"), fallback: true }];

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
// En anglais, les titres anglais de Spotify restent tels quels.
const frTitle = (title) => {
  if (LANG !== "fr") return title;
  for (const [re, fr] of TITLES) if (re.test(title)) return title.replace(re, fr);
  return title;
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
  if (days <= 0) return tr("Aujourd'hui");
  if (days === 1) return tr("Hier");
  if (days < 7) return tr("Il y a {n} j", { n: days });
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
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
      return { uri: data.uri, name: data.profile?.name || data.name, img, sub: tr("Artiste"), round: true };
    case "Episode": {
      const show = data.podcastV2?.data?.name;
      const date = formatDate(data.releaseDate?.isoString);
      return { uri: data.uri, name: data.name, img, sub: [date, show].filter(Boolean).join(" · "), date: data.releaseDate?.isoString };
    }
    case "Podcast":
      return { uri: data.uri, name: data.name, img, sub: data.publisher?.name || "Podcast" };
    case "Audiobook":
      return { uri: data.uri, name: data.name, img, sub: (data.authorsV2 || data.authors || []).map((a) => a.name).filter(Boolean).join(", ") || tr("Livre audio") };
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
  const owner = (title) => {
    if (SKIP_SECTIONS.test(title)) return null;
    return allTabs.find((t) => t.match && t.match.test(title)) || allTabs.find((t) => t.fallback) || null;
  };
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
      baseSub: i.isOwnedBySelf ? tr("Toi") : i.owner?.name || i.madeForName || "Playlist",
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
    Spicetify.showNotification?.(tr("Lecture impossible : ") + (e?.message || e), true);
  }
}

function openUri(uri) {
  const path = Spicetify.URI.fromString(uri)?.toURLPath?.(true);
  if (path) Spicetify.Platform.History.push(path);
}

const likedUri = () => `spotify:user:${Spicetify.Platform.username}:collection`;
const notify = (msg, isError) => Spicetify.showNotification?.(msg, isError);
const errMsg = (e) => e?.message || String(e);
const titles = (n) => (n > 1 ? tr("{n} titres", { n }) : tr("Titre"));

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
    if (!fresh.length) return notify(tr("Déjà dans {name}", { name: pl.name }));
    await P.add(pl.uri, fresh, { after: "end" });
    notify(tr(fresh.length > 1 ? "{n} titres ajoutés à {name}" : "{n} titre ajouté à {name}", { n: fresh.length, name: pl.name }));
  } catch (e) {
    notify(tr("Ajout impossible : ") + errMsg(e), true);
  }
}

async function likeTracks(uris) {
  const L = Spicetify.Platform.LibraryAPI;
  const tracks = uris.filter((u) => u.startsWith("spotify:track:"));
  if (!tracks.length) return notify(tr("Seuls les titres peuvent être likés"), true);
  try {
    const liked = await L.contains(...tracks);
    const fresh = tracks.filter((u, i) => !liked[i]);
    if (!fresh.length) return notify(tr(tracks.length > 1 ? "Déjà dans les titres likés" : "Déjà liké"));
    await L.add({ uris: fresh });
    notify(tr(fresh.length > 1 ? "{n} titres ajoutés aux titres likés" : "{n} titre ajouté aux titres likés", { n: fresh.length }));
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
    h("strong", null, tr("Spotify a changé une partie de ses API internes.")),
    tr(" Certaines fonctions peuvent ne plus marcher ({list}). Mets à jour le thème depuis ", { list: missing.join(", ") }),
    h("a", { href: "https://github.com/Simon-Gaspar/spicetify-compact" }, "github.com/Simon-Gaspar/spicetify-compact"),
    tr(", ou attends une mise à jour de Spicetify."));
}

// Avis de mise à jour (vérifié par l'extension) : masquable pour la version annoncée.
function UpdateBanner() {
  const read = () => window.AccueilCore?.update || null;
  const [update, setUpdate] = useState(read);
  const [hidden, setHidden] = useState(() => lsGet("accueil:update-dismissed"));
  useEffect(() => {
    const refresh = () => setUpdate(read());
    window.addEventListener("accueil:update", refresh);
    return () => window.removeEventListener("accueil:update", refresh);
  }, []);
  if (!update?.available || hidden === update.latest.version) return null;
  const dismiss = () => { lsSet("accueil:update-dismissed", update.latest.version); setHidden(update.latest.version); };
  const notes = update.latest.notes?.[LANG] || update.latest.notes?.en || "";
  return h("div", { className: "acc-alert acc-update" },
    h("strong", null, tr("Nouvelle version du thème : {latest}", { latest: update.latest.version })),
    tr(" (installée : {current}). ", { current: update.current }),
    notes && h("span", null, notes + " "),
    tr("Récupère la dernière version sur "),
    h("a", { href: LANG === "fr" ? "https://github.com/Simon-Gaspar/spicetify-compact/blob/main/README.fr.md#mettre-à-jour" : "https://github.com/Simon-Gaspar/spicetify-compact#update" }, "GitHub"),
    tr(" et relance le script d'installation. "),
    h("button", { className: "acc-link", onClick: dismiss }, tr("Plus tard")));
}

// ---------- composants ----------

const PlayIcon = () => h("svg", { viewBox: "0 0 24 24", width: 20, height: 20, fill: "currentColor" }, h("path", { d: "M7 4.5v15l13-7.5z" }));
const ShuffleIcon = () =>
  h("svg", { viewBox: "0 0 24 24", width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    h("path", { d: "M3 6h3.5c2 0 3.2 1 4.3 2.7l2.4 3.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 18h3.5c1.4 0 2.4-.5 3.2-1.4M13.3 7.4C14.1 6.5 15.1 6 16.5 6H21M18 3l3 3-3 3M18 15l3 3-3 3" }));

// Clic droit : vrai menu contextuel de Spotify autour des cartes de la page, celui de la
// bibliothèque native (trouvé par l'extension, window.AccueilCore.findItemMenu). En secours, les
// menus exposés par Spicetify (sans « PlaylistMenu », qui n'est pas un menu contextuel).
const FALLBACK_MENUS = { album: "AlbumMenu", artist: "ArtistMenu", track: "TrackMenu", show: "PodcastShowMenu" };
function withMenu(uri, el, extra = {}) {
  const RC = Spicetify.ReactComponent;
  const type = uri?.split(":")[1];
  if (!RC?.RightClickMenu || !type) return el;
  const dispatcher = window.AccueilCore?.findItemMenu?.();
  let menu = null;
  if (dispatcher) menu = h(dispatcher, { item: { type, uri, isPlayable: true, ...extra } });
  else if (RC[FALLBACK_MENUS[type]]) menu = h(RC[FALLBACK_MENUS[type]], { uri });
  return menu ? h(RC.RightClickMenu, { trigger: "right-click", menu }, el) : el;
}

function Card({ card }) {
  return withMenu(card.uri, h("div", { className: "acc-card", onClick: () => openUri(card.uri), title: card.name },
    h("div", { className: "acc-cover" + (card.round ? " is-round" : "") },
      card.img ? h("img", { src: card.img, loading: "lazy", alt: "", draggable: false }) : h("div", { className: "acc-ph" }),
      h("button", { className: "acc-play", "aria-label": tr("Lire ") + card.name, onClick: (e) => { e.stopPropagation(); play(card.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-name" }, card.name),
    card.sub && h("div", { className: "acc-sub" }, card.sub)));
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
      limit && items.length > limit && h("button", { className: "acc-link", onClick: () => setOpen(!open) }, open ? tr("Réduire") : tr("Tout afficher ({n})", { n: items.length }))),
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
  if (state.error) return h("div", { className: "acc-empty" }, tr("Impossible de charger : ") + (state.error.message || state.error), " ", h("button", { className: "acc-link", onClick: state.retry }, tr("Réessayer")));
  if (state.loading && !state.data) return h("div", { className: "acc-empty" }, tr("Chargement…"));
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

const playsLabel = (n) => (n ? tr(n > 1 ? " · {n} écoutes" : " · {n} écoute", { n }) : "");
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
  if (progress) return h("div", { className: "acc-hint" }, tr("Analyse des styles de ta bibliothèque… {done}/{total} playlists (une seule fois)", progress));
  const counts = {};
  for (const c of items) {
    const st = styles[c.uri];
    if (st) counts[st] = (counts[st] || 0) + 1;
  }
  const options = [...names, MIXED].filter((st) => counts[st]);
  // Aucun dossier de style dans la bibliothèque : on explique comment en avoir.
  if (!names.length) return h("div", { className: "acc-hint" }, tr("Astuce : range tes playlists dans des dossiers (Électro, Rap, Jazz…) pour filtrer et lancer par style."));
  if (!options.length) return null;
  const launch = async (st) => {
    setBusy(st);
    try { await playFolder(folders[st]); } catch (e) { Spicetify.showNotification?.(tr("Lecture impossible : ") + (e?.message || e), true); }
    setBusy(null);
  };
  return h("div", { className: "acc-styles" },
    h("button", { className: "acc-schip" + (value === "all" ? " is-on" : ""), onClick: () => onChange("all") }, tr("Tous"), h("span", { className: "acc-chip-n" }, items.length)),
    options.map((st) => h("span", { key: st, className: "acc-schip" + (value === st ? " is-on" : "") },
      folders[st] && h("button", { className: "acc-schip-play", title: tr("Lancer tout {style} en aléatoire", { style: tr(st) }), disabled: !!busy, onClick: () => launch(st) }, busy === st ? "…" : h(PlayIcon)),
      h("button", { className: "acc-schip-label", onClick: () => onChange(st) }, tr(st), h("span", { className: "acc-chip-n" }, counts[st])))));
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
  { id: "top", label: tr("Plus écoutées") },
  { id: "recent", label: tr("Récentes") },
  { id: "az", label: "A → Z" },
];
const COLUMNS = [
  { id: "self", label: tr("Mes playlists") },
  { id: "others", label: tr("Playlists des autres") },
  { id: "spotify", label: tr("Playlists Spotify") },
];

// Vignette compacte pour les colonnes de playlists : grille dense, nom sous la pochette.
// Les playlists à soi acceptent qu'on y dépose des titres.
function Tile({ card, showOwner }) {
  const tip = card.name + (showOwner && card.baseSub ? ` — ${card.baseSub}` : "") + playsLabel(card.n);
  const [over, drop] = useDrop((uris) => addToPlaylist(card, uris));
  return withMenu(card.uri, h("div", { className: "acc-tile" + (over ? " is-drop" : ""), onClick: () => openUri(card.uri), title: tip, ...(card.group === "self" ? drop : {}) },
    h("div", { className: "acc-tile-img" },
      card.img ? h("img", { src: card.img, loading: "lazy", alt: "", draggable: false }) : null,
      card.n > 0 && h("span", { className: "acc-tile-n" }, card.n),
      h("button", { className: "acc-tile-play", "aria-label": tr("Lire ") + card.name, onClick: (e) => { e.stopPropagation(); play(card.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-tile-name" }, card.name)));
}

function Column({ id, label, items }) {
  const [n, setN] = useState(60);
  return h("div", { className: "acc-col" },
    h("div", { className: "acc-col-head" }, h("h2", null, label), h("span", { className: "acc-count" }, items.length)),
    items.length
      ? h("div", { className: "acc-tiles" }, items.slice(0, n).map((c) => h(Tile, { key: c.uri, card: c, showOwner: id === "others" })))
      : h("div", { className: "acc-sub" }, tr("Aucune playlist")),
    items.length > n && h("button", { className: "acc-link acc-col-more", onClick: () => setN(n + 120) }, tr("Afficher plus ({n})", { n: items.length - n })));
}

// ---------- suggestions de rangement ----------
// Trois cas, chacun avec une action d'un clic et « Ignorer » :
// - playlist d'un dossier de style dont les artistes relèvent surtout d'un autre style ;
// - playlist en vrac à la racine dont le style est net (hors épinglées et saisons) ;
// - playlist pas écoutée depuis plus d'un an (quand Spotify connaît la date), à archiver.
// Le style d'un artiste est compté sans la playlist examinée : sinon un artiste présent seulement
// là « voterait » toujours pour son dossier actuel. Résultat gardé une semaine (accueil:tidy).
const TIDY_KEY = "accueil:tidy";
const TIDY_IGNORED = "accueil:tidy-ignored";
const TIDY_TTL = 7 * 86400000;
const ARCHIVE_FOLDER = "ARCHIVES";
const SEASON_NAME = /^(hiver|printemps|été|automne)\s*['‘’`´]\s*\d{2}$/i;

async function analyzeLibrary(onProgress) {
  const P = Spicetify.Platform;
  const tree = await P.RootlistAPI.getContents({});
  const folders = styleFoldersOf(tree);
  const where = {};
  const walk = (items, label) => {
    for (const i of items) {
      if (i.type === "folder") walk(i.items || [], label);
      else if (i.type === "playlist") where[i.uri] = { label, name: i.name };
    }
  };
  for (const { label, folder } of folders) walk(folder.items || [], label);

  const pins = new Set(window.AccueilCore?.readPins?.() || []);
  const loose = tree.items.filter((i) => i.type === "playlist" && !pins.has(i.uri) && !SEASON_NAME.test((i.name || "").trim()));
  const uris = [...Object.keys(where), ...loose.map((i) => i.uri)];
  const artistsOf = {};
  let done = 0;
  onProgress?.({ done, total: uris.length });
  await pool(uris, 6, async (uri) => {
    try { artistsOf[uri] = [...new Set(await trackArtists(uri, 150))]; } catch { artistsOf[uri] = []; }
    done += 1;
    if (done % 10 === 0) onProgress?.({ done, total: uris.length });
  });

  const votes = {};
  for (const [uri, { label }] of Object.entries(where)) for (const a of artistsOf[uri]) { const v = (votes[a] ||= {}); v[label] = (v[label] || 0) + 1; }
  const judge = (uri, own) => {
    const tally = {};
    let known = 0;
    for (const a of artistsOf[uri]) {
      const v = { ...(votes[a] || {}) };
      if (own) v[own] = (v[own] || 0) - 1;
      const best = Object.entries(v).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1])[0];
      if (!best) continue;
      known += 1;
      tally[best[0]] = (tally[best[0]] || 0) + 1;
    }
    const [top, n] = Object.entries(tally).sort((x, y) => y[1] - x[1])[0] || [];
    const total = artistsOf[uri].length;
    return { top, share: known ? n / known : 0, ownShare: own && known ? (tally[own] || 0) / known : 0, known, total, reliable: known >= 8 && known / (total || 1) >= 0.25 };
  };

  const folderOf = Object.fromEntries(folders.map((f) => [f.label, f.folder.uri]));
  const misplaced = [];
  for (const [uri, { label, name }] of Object.entries(where)) {
    const j = judge(uri, label);
    if (j.reliable && j.top !== label && j.share >= 0.6 && j.ownShare < 0.25)
      misplaced.push({ uri, name, from: label, to: j.top, toFolder: folderOf[j.top], share: j.share, known: j.known, total: j.total });
  }
  const toFile = [];
  for (const i of loose) {
    const j = judge(i.uri, null);
    if (j.reliable && j.share >= 0.6) toFile.push({ uri: i.uri, name: i.name, to: j.top, toFolder: folderOf[j.top], share: j.share, known: j.known, total: j.total });
  }

  const lib = await P.LibraryAPI.getContents({ filters: ["2"], flattenTree: true, limit: 1000 });
  const skip = new Set();
  (function mark(items, inside) {
    for (const i of items) {
      const archival = inside || (i.type === "folder" && (i.name === "SAISONS" || i.name === ARCHIVE_FOLDER));
      if (i.type === "playlist" && archival) skip.add(i.uri);
      if (i.items) mark(i.items, archival);
    }
  })(tree.items, false);
  const yearAgo = Date.now() - 365 * 86400000;
  const playlists = (lib.items || []).filter((i) => i.type === "playlist");
  const dormant = playlists
    .filter((i) => i.lastPlayedAt && Date.parse(i.lastPlayedAt) < yearAgo && !skip.has(i.uri) && !pins.has(i.uri))
    .map((i) => ({ uri: i.uri, name: i.name, last: i.lastPlayedAt }));
  const images = Object.fromEntries(playlists.map((i) => [i.uri, i.images?.[0]?.url || null]));
  for (const list of [misplaced, toFile, dormant]) for (const x of list) x.img = images[x.uri] || null;
  return {
    misplaced: misplaced.sort((a, b) => b.share - a.share),
    toFile,
    dormant,
    undated: playlists.filter((i) => !i.lastPlayedAt).length,
  };
}

// Mise à jour de l'index des styles après un déplacement (sinon il attendrait sa reconstruction hebdo).
function restyle(uri, label) {
  const idx = lsGet(STYLE_KEY);
  if (!idx?.playlists) return;
  if (label) idx.playlists[uri] = label; else delete idx.playlists[uri];
  lsSet(STYLE_KEY, idx);
  styleIndexPromise = null;
}

async function moveToFolder(uri, folderUri) {
  await Spicetify.Platform.RootlistAPI.move([{ uri }], { after: { uri: folderUri } });
}

async function archiveFolderUri() {
  const R = Spicetify.Platform.RootlistAPI;
  const find = async () => (await R.getContents({})).items.find((i) => i.type === "folder" && i.name === ARCHIVE_FOLDER)?.uri;
  return (await find()) || (await R.createFolder(ARCHIVE_FOLDER, { after: "end" })).uri || (await find());
}

function TidyPanel({ onClose }) {
  const [data, setData] = useState(() => {
    const c = lsGet(TIDY_KEY);
    return c && Date.now() - c.at < TIDY_TTL ? c.data : null;
  });
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [ignored, setIgnored] = useState(() => new Set(lsGet(TIDY_IGNORED) || []));
  const [done, setDone] = useState(() => new Set());
  const run = () => {
    setError(null);
    setProgress({ done: 0, total: 0 });
    analyzeLibrary(setProgress).then((d) => { lsSet(TIDY_KEY, { at: Date.now(), data: d }); setData(d); setProgress(null); },
      (e) => { setError(errMsg(e)); setProgress(null); });
  };
  useEffect(() => { if (!data) run(); }, []);
  const ignore = (uri) => { const next = new Set(ignored).add(uri); setIgnored(next); lsSet(TIDY_IGNORED, [...next]); };
  const act = async (item, fn, msg) => {
    try { await fn(); setDone(new Set(done).add(item.uri)); notify(msg); } catch (e) { notify(tr("Rangement impossible : ") + errMsg(e), true); }
  };
  const visible = (list) => (list || []).filter((x) => !ignored.has(x.uri) && !done.has(x.uri));
  const pct = (x) => `${Math.round(x.share * 100)} %`;

  const row = (x, reason, action) => h("div", { key: x.uri, className: "acc-tidy-row" },
    h("div", { className: "acc-tidy-img", onClick: () => openUri(x.uri) }, x.img && h("img", { src: x.img, alt: "" })),
    h("div", { className: "acc-tidy-text" },
      h("a", { className: "acc-tidy-name", onClick: () => openUri(x.uri) }, x.name),
      h("div", { className: "acc-sub" }, reason)),
    action,
    h("button", { className: "acc-sort", onClick: () => ignore(x.uri) }, tr("Ignorer")));
  const move = (x, label) => x.toFolder && h("button", { className: "acc-chip is-small", onClick: () => act(x, async () => { await moveToFolder(x.uri, x.toFolder); restyle(x.uri, x.to); }, tr("« {name} » rangée dans {label}", { name: x.name, label })) }, tr("Déplacer vers {label}", { label }));
  const group = (title, items, render) => items.length > 0 && h("div", { className: "acc-tidy-group" }, h("h3", null, `${title} · ${items.length}`), items.map(render));

  let body;
  if (error) body = h("div", { className: "acc-sub" }, tr("Analyse impossible : ") + error);
  else if (progress) body = h("div", { className: "acc-hint" }, tr("Analyse de ta bibliothèque… {done}/{total} playlists", { done: progress.done, total: progress.total || "…" }));
  else if (data) {
    const misplaced = visible(data.misplaced), toFile = visible(data.toFile), dormant = visible(data.dormant);
    body = h(React.Fragment, null,
      !misplaced.length && !toFile.length && !dormant.length && h("div", { className: "acc-sub" }, tr("Rien à ranger : ta bibliothèque est en ordre.")),
      group(tr("Mal rangées"), misplaced, (x) => row(x, tr("Rangée dans {from}, mais {pct} de ses artistes ({known} reconnus sur {total}) relèvent de {to}", { from: x.from, pct: pct(x), known: x.known, total: x.total, to: x.to }), move(x, x.to))),
      group(tr("En vrac"), toFile, (x) => row(x, tr("À la racine ; {pct} de ses artistes ({known} reconnus sur {total}) relèvent de {to}", { pct: pct(x), known: x.known, total: x.total, to: x.to }), move(x, x.to))),
      group(tr("Pas écoutées depuis plus d'un an"), dormant, (x) => row(x, tr("Dernière écoute : {date}", { date: new Date(x.last).toLocaleDateString(LOCALE, { month: "long", year: "numeric" }) }),
        h("button", { className: "acc-chip is-small", onClick: () => act(x, async () => { await moveToFolder(x.uri, await archiveFolderUri()); restyle(x.uri, null); }, tr("« {name} » archivée dans {folder}", { name: x.name, folder: ARCHIVE_FOLDER })) }, tr("Archiver")))),
      data.undated > 0 && h("div", { className: "acc-hint acc-tidy-note" }, tr(data.undated > 1 ? "Spotify ne garde pas de date d'écoute pour {n} playlists : celles qui dorment ne peuvent pas toutes être repérées." : "Spotify ne garde pas de date d'écoute pour {n} playlist : celles qui dorment ne peuvent pas toutes être repérées.", { n: data.undated })));
  }

  return h("div", { className: "acc-tidy" },
    h("div", { className: "acc-tidy-head" },
      h("h2", null, tr("Suggestions de rangement")),
      h("div", { className: "acc-sorts" },
        !progress && h("button", { className: "acc-sort", onClick: run }, tr("Actualiser")),
        h("button", { className: "acc-sort", onClick: onClose }, tr("Fermer")))),
    body);
}

function MyPlaylists() {
  const state = useAsync(fetchPlaylists, []);
  const [sort, setSort] = useState("top");
  const [style, setStyle] = useState("all");
  const [tidy, setTidy] = useState(false);
  const plays = usePlays();
  const { styles, progress, names } = useStyles(state.data);
  const sorted = useMemo(() => {
    const list = withPlays(state.data || [], plays);
    if (sort === "az") return list.sort(byName);
    if (sort === "recent") return list.sort(byRecent);
    return list.sort((a, b) => b.n - a.n || byRecent(a, b));
  }, [state.data, sort, plays]);
  const shown = sorted.filter(byStyle(style, styles));
  const since = plays._since ? new Date(plays._since).toLocaleDateString(LOCALE) : null;
  const sorts = PLAYLIST_SORTS.map((o) => (o.id === "top" ? { ...o, title: since ? tr("Écoutes comptées depuis le {since}, tous appareils (une écoute = un lancement), puis par écoute récente", { since }) : tr("Par écoute récente, en attendant le nombre d'écoutes") } : o));

  return h(Status, { state }, () =>
    h("section", { className: "acc-section" },
      h(Toolbar, null,
        h(StyleBar, { items: sorted, styles, names, progress, value: style, onChange: setStyle }),
        h("div", { className: "acc-sorts" },
          h(Sorts, { options: sorts, value: sort, onChange: setSort }),
          h("button", { className: "acc-sort" + (tidy ? " is-on" : ""), title: tr("Playlists mal rangées, en vrac ou en sommeil"), onClick: () => setTidy(!tidy) }, tr("Ranger")))),
      tidy && h(TidyPanel, { onClose: () => setTidy(false) }),
      h("div", { className: "acc-cols" },
        COLUMNS.map((c) => h(Column, { key: c.id + sort + style, id: c.id, label: c.label, items: shown.filter((p) => p.group === c.id) })))));
}

const ALBUM_SORTS = [
  { id: "top", label: tr("Plus écoutés") },
  { id: "recent", label: tr("Récents") },
  { id: "added", label: tr("Ajoutés") },
  { id: "az", label: "A → Z" },
  { id: "artist", label: tr("Artiste") },
  { id: "release", label: tr("Sortie ↓"), title: tr("Date de sortie, les plus récents d'abord") },
  { id: "release-asc", label: tr("Sortie ↑"), title: tr("Date de sortie, les plus anciens d'abord") },
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
      datesProgress && h("div", { className: "acc-hint acc-note" }, tr("Lecture des dates de sortie… {done}/{total} (une seule fois)", datesProgress)),
      h(SectionlessGrid, { key: sort + style, items: shown })));
}

function SectionlessGrid({ items }) {
  const [n, setN] = useState(48);
  return h(React.Fragment, null,
    h(Grid, { items: items.slice(0, n) }),
    items.length > n && h("div", { className: "acc-more" }, h("button", { className: "acc-chip", onClick: () => setN(n + 96) }, tr("Afficher plus ({n} restants)", { n: items.length - n }))));
}

function HomeSections({ facet, tab, tabs }) {
  const state = useAsync(() => fetchHome(facet), [facet]);
  const sections = useMemo(() => (state.data ? sectionsFor(tab, tabs, state.data) : []), [state.data]);
  return h(Status, { state }, () =>
    !sections.length
      ? h("div", { className: "acc-empty" }, tr("Rien à afficher ici pour le moment."))
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
    filtered.length ? filtered.map((s) => h(Section, { key: s.title + style, title: s.title, items: s.items, limit })) : h("div", { className: "acc-empty" }, tr("Rien dans ce style ici.")));
}

function LikedHero({ reorder, drag }) {
  const [over, drop] = useDrop(likeTracks);
  const { handlers, cls } = pinDrag(LIKED_PIN, reorder, drag, drop);
  return h("div", { className: "acc-liked" + (over ? " is-drop" : "") + cls, onClick: () => Spicetify.Platform.History.push("/collection/tracks"), title: tr("Titres likés — glisser pour réorganiser"), ...handlers },
    h("div", { className: "acc-liked-art" }, h("svg", { viewBox: "0 0 24 24", width: 28, height: 28, fill: "#fff" }, h("path", { d: "M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" }))),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, tr("Titres likés")),
      h("div", { className: "acc-sub" }, over ? tr("Lâcher pour liker") : tr("Lecture ou aléatoire"))),
    h("button", { className: "acc-round is-ghost", title: tr("Lecture aléatoire"), onClick: (e) => { e.stopPropagation(); play(likedUri(), true); } }, h(ShuffleIcon)),
    h("button", { className: "acc-round", title: tr("Lire"), onClick: (e) => { e.stopPropagation(); play(likedUri(), false); } }, h(PlayIcon)));
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


// ---------- plus tard ----------
// Liste tenue par l'extension accueil-core.js (menu clic droit « Écouter plus tard »).
const LATER_KINDS = [
  { id: "all", label: tr("Tout") },
  { id: "track", label: tr("Titres") },
  { id: "album", label: tr("Albums") },
  { id: "playlist", label: "Playlists" },
  { id: "artist", label: tr("Artistes") },
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
  } catch (e) { notify(tr("Lecture impossible : ") + errMsg(e), true); }
}

function LaterCard({ item }) {
  const remove = (e) => { e.stopPropagation(); window.AccueilCore?.removeLater?.([item.uri]); };
  return withMenu(item.uri, h("div", { className: "acc-card" + (item.played ? " is-played" : ""), onClick: () => openUri(item.uri), title: item.name },
    h("div", { className: "acc-cover" + (item.round ? " is-round" : "") },
      item.img ? h("img", { src: item.img, loading: "lazy", alt: "", draggable: false }) : h("div", { className: "acc-ph" }),
      item.played && h("span", { className: "acc-badge" }, tr("Écouté")),
      h("button", { className: "acc-remove", title: tr("Retirer de « Plus tard »"), onClick: remove }, "×"),
      h("button", { className: "acc-play", "aria-label": tr("Lire ") + item.name, onClick: (e) => { e.stopPropagation(); play(item.uri); } }, h(PlayIcon))),
    h("div", { className: "acc-name" }, item.name),
    h("div", { className: "acc-sub" }, [LATER_KINDS.find((k) => k.id === item.kind)?.label.replace(/s$/, ""), item.sub].filter(Boolean).join(" · "))));
}

function Later() {
  const list = useLater();
  const [kind, setKind] = useState("all");
  const shown = list.filter((i) => kind === "all" || i.kind === kind);
  const tracks = shown.filter((i) => i.kind === "track" && !i.played).map((i) => i.uri);
  const played = list.filter((i) => i.played).map((i) => i.uri);
  if (!list.length) return h("div", { className: "acc-empty" }, tr("Rien pour l'instant. Clic droit sur un titre, un album, une playlist ou un artiste → « Écouter plus tard »."));
  return h("section", { className: "acc-section" },
    h(Toolbar, null,
      h("div", { className: "acc-styles" },
        LATER_KINDS.map((k) => {
          const n = k.id === "all" ? list.length : list.filter((i) => i.kind === k.id).length;
          return n > 0 && h("button", { key: k.id, className: "acc-schip" + (kind === k.id ? " is-on" : ""), onClick: () => setKind(k.id) }, k.label, h("span", { className: "acc-chip-n" }, n));
        })),
      h("div", { className: "acc-sorts" },
        tracks.length > 0 && h("button", { className: "acc-sort", onClick: () => playTracks(tracks) }, tr("▶ Lire les titres ({n})", { n: tracks.length })),
        played.length > 0 && h("button", { className: "acc-sort", onClick: () => window.AccueilCore?.removeLater?.(played) }, tr("Retirer les écoutés ({n})", { n: played.length })))),
    h("div", { className: "acc-grid" }, shown.map((i) => h(LaterCard, { key: i.uri, item: i }))));
}

// ---------- discographie ----------
// Page /accueil/discographie/<id>, ouverte depuis le menu clic droit « Discographie complète ».
const RELEASE_TYPES = { ALBUM: tr("Albums"), EP: "EP", SINGLE: tr("Singles"), COMPILATION: tr("Compilations") };
const RELEASE_ONE = { ALBUM: "Album", EP: "EP", SINGLE: "Single", COMPILATION: tr("Compilation") };

async function fetchDiscography(id) {
  const G = Spicetify.GraphQL;
  const uri = `spotify:artist:${id}`;
  const releases = [];
  for (let offset = 0; ; offset += 50) {
    const r = await G.Request(G.Definitions.queryArtistDiscographyAll, { uri, offset, limit: 50, order: "DATE_DESC" });
    const all = r?.data?.artistUnion?.discography?.all;
    if (!all) throw new Error(tr("discographie introuvable"));
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
  { id: "new", label: tr("Récentes") },
  { id: "old", label: tr("Anciennes") },
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
    const cards = list.map((r) => ({ ...r, sub: [r.date.slice(0, 4), RELEASE_ONE[r.type] || "", r.tracks ? tr(r.tracks > 1 ? "{n} titres" : "{n} titre", { n: r.tracks }) : "", r.saved ? tr("✓ dans ta bibliothèque") : ""].filter(Boolean).join(" · ") }));
    const chip = (t, label, n) => n > 0 && h("button", { key: t, className: "acc-schip" + (type === t ? " is-on" : ""), onClick: () => setType(t) }, label, h("span", { className: "acc-chip-n" }, n));
    return h("section", { className: "acc-section" },
      h("div", { className: "acc-disco-head" },
        d.avatar && h("img", { className: "acc-disco-avatar", src: d.avatar, alt: "" }),
        h("div", null,
          h("div", { className: "acc-disco-kicker" }, tr("Discographie complète")),
          h("h1", { className: "acc-disco-name" }, d.name || tr("Artiste")),
          h("div", { className: "acc-sub" }, tr("{n} sorties · ", { n: d.releases.length }), h("a", { className: "acc-link", onClick: () => openUri(d.uri) }, tr("page de l'artiste"))))),
      h(Toolbar, null,
        h("div", { className: "acc-styles" },
          chip("all", tr("Tout"), d.releases.length),
          Object.entries(RELEASE_TYPES).map(([t, label]) => chip(t, label, count(t))),
          chip("saved", tr("Dans ta bibliothèque"), count("saved"))),
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


// ---------- épinglés ----------
// Le haut de l'accueil affiche les éléments épinglés au clic droit (« Épingler sur l'accueil »),
// dans l'ordre d'épinglage : rien de propre à une bibliothèque dans le code, chacun a les siens.
// Liste tenue par l'extension accueil-core.js (au premier lancement : épingles de la bibliothèque).
// Onglet Musique : playlists, albums, dossiers, artistes ; onglet Podcasts : épisodes, émissions.
const PIN_GROUPS = { "your-episodes": "podcasts", show: "podcasts", episode: "podcasts", audiobook: "podcasts" };
const pinGroup = (item) => PIN_GROUPS[item.type] || "music"; // Titres likés (type "liked") : musique
const TOP_RE = /all[- ]time top songs|de tous les temps/i;

function usePins() {
  const read = () => window.AccueilCore?.readPins?.() ?? lsGet("accueil:pins") ?? [];
  const [uris, setUris] = useState(read);
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    const refresh = () => setUris(read());
    window.addEventListener("accueil:pins", refresh);
    return () => window.removeEventListener("accueil:pins", refresh);
  }, []);
  // Nom, image, type : depuis la bibliothèque, sinon via les métadonnées (élément non sauvegardé).
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await Spicetify.Platform.LibraryAPI.getContents({ flattenTree: true, limit: 1000 }).catch(() => ({ items: [] }));
      const byUri = new Map((r.items || []).map((i) => [i.uri, i]));
      const out = {};
      for (const uri of uris) {
        if (uri === LIKED_PIN) continue;
        let it = byUri.get(uri);
        if (!it) {
          try {
            const d = await window.AccueilCore.describe(uri);
            it = { uri, name: d.name, images: d.img ? [{ url: d.img }] : [], type: d.kind, owner: { name: d.sub }, artists: d.kind === "album" ? [{ name: d.sub }] : undefined };
          } catch (e) { warn("épingle", e); continue; }
        }
        out[uri] = it;
      }
      if (alive) setMeta(out);
    })();
    return () => { alive = false; };
  }, [uris.join("|")]);
  const order = uris.includes(LIKED_PIN) ? uris : [...uris, LIKED_PIN];
  return meta && order.map((u) => (u === LIKED_PIN ? { uri: LIKED_PIN, type: "liked" } : meta[u])).filter(Boolean);
}

function pinLabel(item) {
  const core = window.AccueilCore;
  if (TOP_RE.test(item.name || "")) return ["All-Time Top", tr("Tes titres de toujours")];
  if (core && core.normName(item.name || "") === core.normName(core.currentSeason())) return [item.name, tr("Saison en cours")];
  switch (item.type) {
    case "your-episodes": return [tr("Tes épisodes"), tr("Épisodes enregistrés")];
    case "folder": return [item.name, tr("Dossier")];
    case "album": return [item.name, (item.artists || []).map((a) => a.name).join(", ") || "Album"];
    case "artist": return [item.name, tr("Artiste")];
    case "show": return [item.name, tr("Émission")];
    default: return [item.name, item.isOwnedBySelf ? tr("Ta playlist") : item.owner?.name || "Playlist"];
  }
}

async function playPinned(item) {
  if (item.type !== "folder") return play(item.uri);
  try {
    const find = (items) => { for (const i of items) { if (i.uri === item.uri) return i; const f = i.items && find(i.items); if (f) return f; } return null; };
    const folder = find((await Spicetify.Platform.RootlistAPI.getContents({})).items);
    if (folder) await playFolder(folder);
  } catch (e) { notify(tr("Lecture impossible : ") + errMsg(e), true); }
}

// Réorganisation des épingles par glisser-déposer, avec un type de glisser propre (distinct des
// titres Spotify qu'on dépose sur une carte pour les ajouter à la playlist).
const PIN_DRAG = "application/x-accueil-pin";
const isPinDrag = (e) => e.dataTransfer.types.includes(PIN_DRAG);

// Titres likés : pseudo-épingle, rangée avec les autres (à la fin tant qu'on ne l'a pas déplacée).
const LIKED_PIN = "accueil:liked";

// Props de glisser-déposer d'une carte épinglée : réorganisation (type PIN_DRAG) et, si `drop` est
// fourni, dépôt de titres Spotify sur la carte.
function pinDrag(uri, reorder, drag, drop) {
  const handlers = {
    draggable: true,
    onDragStart: (e) => { e.dataTransfer.setData(PIN_DRAG, uri); e.dataTransfer.effectAllowed = "move"; reorder.start(uri); },
    onDragEnd: () => reorder.end(),
    onDragOver: (e) => {
      if (isPinDrag(e)) {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        reorder.over(uri, e.clientX < r.left + r.width / 2 ? "before" : "after");
      } else drop?.onDragOver(e);
    },
    onDragLeave: (e) => drop?.onDragLeave(e),
    onDrop: (e) => { if (isPinDrag(e)) { e.preventDefault(); reorder.drop(); } else drop?.onDrop(e); },
  };
  const cls = (drag?.uri === uri ? " is-dragging" : "") + (drag?.target === uri && drag.uri !== uri ? ` is-drop-${drag.side}` : "");
  return { handlers, cls };
}

function PinHero({ item, reorder, drag }) {
  const [title, sub] = pinLabel(item);
  const droppable = item.type === "playlist" && item.isOwnedBySelf;
  const [over, drop] = useDrop((uris) => addToPlaylist({ uri: item.uri, name: item.name }, uris));
  const img = item.images?.[0]?.url;
  const isSeason = sub === tr("Saison en cours");
  const open = () => (item.type === "your-episodes" ? Spicetify.Platform.History.push("/collection/your-episodes") : openUri(item.uri));
  const { handlers, cls: dragCls } = pinDrag(item.uri, reorder, drag, droppable ? drop : null);
  const cls = "acc-liked" + (over ? " is-drop" : "") + dragCls;
  return withMenu(item.uri, h("div", { className: cls, onClick: open, title: tr("{name} — glisser pour réorganiser", { name: item.name }), ...handlers },
    h("div", { className: "acc-liked-art" + (isSeason ? " is-season" : "") }, img ? h("img", { src: img, alt: "" }) : null),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, title),
      h("div", { className: "acc-sub" }, over ? tr("Lâcher pour ajouter") : sub)),
    h("button", { className: "acc-pin-x", title: tr("Retirer de l'accueil"), onClick: (e) => { e.stopPropagation(); window.AccueilCore?.unpinUri?.(item.uri); } }, "×"),
    h("button", { className: "acc-round", title: tr("Lire"), onClick: (e) => { e.stopPropagation(); playPinned(item); } }, h(PlayIcon))));
}

// 3 emplacements en tout dans l'onglet Musique, Titres likés compris : 2 épingles au choix.
const PIN_SLOTS = 2;

// Emplacement libre : carte en pointillé qui explique comment épingler.
function PinSlot() {
  return h("div", { className: "acc-slot", title: tr("Clic droit sur une playlist, un album, un artiste ou un dossier → « Épingler sur l'accueil »") },
    h("div", { className: "acc-slot-plus" }, "+"),
    h("div", { className: "acc-liked-text" },
      h("div", { className: "acc-liked-title" }, tr("Épingle une playlist")),
      h("div", { className: "acc-sub" }, tr("Clic droit → Épingler sur l'accueil"))));
}

function PinnedHeroes({ main }) {
  const pinned = usePins();
  // Musique : 2 épingles au plus à côté de Titres likés ; au-delà, seules les 2 premières.
  let kept = 0;
  const shown = (pinned || []).filter((i) => pinGroup(i) === main && (main !== "music" || i.type === "liked" || ++kept <= PIN_SLOTS));
  const [drag, setDrag] = useState(null); // { uri, target, side }
  const reorder = {
    start: (uri) => setDrag({ uri }),
    over: (target, side) => setDrag((d) => (d && (d.target !== target || d.side !== side) ? { ...d, target, side } : d)),
    end: () => setDrag(null),
    drop: () => {
      const core = window.AccueilCore;
      if (drag?.target && drag.target !== drag.uri && core?.setPins) {
        const saved = core.readPins() || [];
        const list = (saved.includes(LIKED_PIN) ? saved : [...saved, LIKED_PIN]).filter((u) => u !== drag.uri);
        let i = list.indexOf(drag.target);
        i = i < 0 ? list.length : i + (drag.side === "after" ? 1 : 0);
        list.splice(i, 0, drag.uri);
        core.setPins(list);
      }
      setDrag(null);
    },
  };
  // Musique : les places libres s'affichent en pointillé, pour montrer qu'on choisit ce qui va là.
  const free = main === "music" && pinned ? Math.max(0, PIN_SLOTS - shown.filter((i) => i.type !== "liked").length) : 0;
  const slots = Array.from({ length: free }, (_, k) => h(PinSlot, { key: "slot" + k }));
  const cards = shown.map((i) => (i.type === "liked" ? h(LikedHero, { key: i.uri, reorder, drag }) : h(PinHero, { key: i.uri, item: i, reorder, drag })));
  const likedAt = shown.findIndex((i) => i.type === "liked");
  if (likedAt >= 0) cards.splice(likedAt, 0, ...slots); else cards.push(...slots);
  return h("div", { className: "acc-heroes" },
    cards,
    main === "podcasts" && pinned && !shown.length && h("div", { className: "acc-pin-hint" }, tr("Clic droit sur une émission ou un livre audio → « Épingler sur l'accueil » pour le retrouver ici.")),
    !pinned && main === "music" && h(LikedHero, { reorder, drag }));
}

async function fetchAudiobooks() {
  const r = await Spicetify.Platform.LibraryAPI.getContents({ filters: ["4"], limit: 200 });
  return (r.items || []).filter((i) => i.type === "audiobook").map((i) => ({
    uri: i.uri, name: i.name, img: i.images?.[0]?.url || null,
    sub: (i.authors || []).map((a) => a.name).join(", ") || tr("Livre audio"),
  }));
}

// Onglet Podcasts → Livres audio : les tiens, puis les suggestions de Spotify.
function Audiobooks() {
  const mine = useAsync(fetchAudiobooks, []);
  const home = useAsync(() => fetchHome("audiobooks-chip"), []);
  const suggested = useMemo(() => (home.data ? sectionsFor(AUDIOBOOK_TABS[0], AUDIOBOOK_TABS, home.data) : []), [home.data]);
  return h(React.Fragment, null,
    h(Status, { state: mine }, () => mine.data.length
      ? h(Section, { title: tr("Mes livres audio"), items: mine.data, limit: 12 })
      : h("div", { className: "acc-hint acc-note" }, tr("Aucun livre audio dans ta bibliothèque : en voici quelques-uns pour toi."))),
    h(Status, { state: home }, () => suggested.map((sec) => h(Section, { key: sec.title, title: sec.title, items: sec.items, limit: 12 }))));
}

const MAIN_TABS = [
  { id: "music", label: tr("Musique"), tabs: MUSIC_TABS, facet: "music-chip" },
  { id: "podcasts", label: tr("Podcasts & livres"), tabs: PODCAST_TABS, facet: "podcasts-chip" },
];

function AccueilApp() {
  const [main, setMain] = useState("music");
  const [sub, setSub] = useState({ music: "playlists", podcasts: "episodes" });
  const mainTab = MAIN_TABS.find((m) => m.id === main);
  const tabs = mainTab.tabs;
  const tab = tabs.find((t) => t.id === sub[main]);
  useEffect(() => { fetchHome("music-chip").catch(() => {}); }, []);
  const path = usePath();
  const later = useLater();

  const disco = path.match(/^\/accueil\/discographie\/([A-Za-z0-9]+)/);
  if (disco) {
    return h("div", { className: "acc-page" },
      h("style", null, CSS),
      h("button", { className: "acc-link acc-back", onClick: () => Spicetify.Platform.History.goBack() }, tr("← Retour")),
      h(Discography, { key: disco[1], id: disco[1] }));
  }

  let body;
  if (main === "music" && tab.id === "playlists") body = h(MyPlaylists);
  else if (main === "music" && tab.id === "later") body = h(Later);
  else if (main === "music" && tab.id === "albums") body = h(MyAlbums);
  else if (main === "podcasts" && tab.id === "books") body = h(Audiobooks);
  else body = h(HomeSections, { key: main + tab.id, facet: mainTab.facet, tab, tabs });

  return h("div", { className: "acc-page" },
    h("style", null, CSS),
    h(HealthBanner),
    h(UpdateBanner),
    h("header", { className: "acc-header" },
      h("nav", { className: "acc-main-tabs" },
        MAIN_TABS.map((m) =>
          h("button", { key: m.id, className: "acc-main-tab" + (main === m.id ? " is-on" : ""), onClick: () => setMain(m.id) }, m.label))),
      h(PinnedHeroes, { main })),
    h("nav", { className: "acc-subnav" },
      tabs.map((t) => h("button", { key: t.id, className: "acc-chip" + (t.id === tab.id ? " is-on" : ""), onClick: () => setSub({ ...sub, [main]: t.id }) },
        t.label, t.id === "later" && later.length > 0 && h("span", { className: "acc-chip-n" }, later.length)))),
    body);
}

function render() {
  return h(AccueilApp);
}

const CSS = `
/* En-tête collant de Spotify (bande colorée qui apparaît au défilement, vide sur cette page) :
   masqué tant que l'accueil est affiché — ce CSS disparaît avec la page. */
header[data-testid="topbar"] { display: none !important; }
.acc-page { --acc-green: #1ed760; --acc-text: #fff; --acc-sub: #b3b3b3; --acc-chip: rgba(255,255,255,.07); --acc-chip-hover: rgba(255,255,255,.12);
  padding: 24px clamp(16px, 2vw, 40px) 48px; color: var(--acc-text); }
/* Onglets à gauche, cartes épinglées à droite sur la même ligne ; les cartes rétrécissent, puis
   passent à la ligne entre elles (toujours à droite). Sous les onglets seulement en fenêtre étroite. */
.acc-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
@media (max-width: 1000px) { .acc-header { flex-wrap: wrap; } .acc-heroes { justify-content: flex-start; } }
.acc-main-tabs { display: flex; gap: 28px; flex: none; white-space: nowrap; }
.acc-main-tab { background: none; border: 0; padding: 4px 0; color: var(--acc-sub); font-size: 2rem; font-weight: 700; letter-spacing: -.02em; cursor: pointer; border-bottom: 3px solid transparent; }
.acc-main-tab:hover { color: var(--acc-text); }
.acc-main-tab.is-on { color: var(--acc-text); border-bottom-color: var(--acc-green); }
.acc-liked { display: flex; align-items: center; gap: 14px; padding: 8px 10px 8px 8px; flex: 0 1 300px; min-width: 0; border-radius: 8px; background: var(--acc-chip); cursor: pointer; }
.acc-liked:hover { background: var(--acc-chip-hover); }
.acc-liked-art { width: 56px; height: 56px; flex: none; border-radius: 4px; display: grid; place-items: center; background: linear-gradient(135deg, #450af5, #c4efd9); }
.acc-liked-text { flex: 1; min-width: 0; overflow: hidden; }
.acc-liked-text .acc-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.acc-liked-title { font-weight: 700; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-liked-text .acc-sub { -webkit-line-clamp: 1; }
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
.acc-liked { position: relative; }
.acc-pin-x { position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; border: 0; border-radius: 50%; background: rgba(0,0,0,.75); color: #fff; font-size: .95rem; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .12s; z-index: 1; }
.acc-liked:hover .acc-pin-x, .acc-pin-x:focus-visible { opacity: 1; }
.acc-tidy { margin: 0 0 28px; padding: 18px 20px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
.acc-tidy-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.acc-tidy-head h2 { font-size: 1.125rem; font-weight: 700; margin: 0; }
.acc-tidy-group { margin-top: 14px; }
.acc-tidy-group h3 { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--acc-sub); margin: 0 0 6px; }
.acc-tidy-row { display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 6px; }
.acc-tidy-row:hover { background: var(--acc-chip); }
.acc-tidy-img { width: 40px; height: 40px; flex: none; border-radius: 4px; overflow: hidden; background: #282828; cursor: pointer; }
.acc-tidy-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.acc-tidy-text { flex: 1; min-width: 0; }
.acc-tidy-name { font-weight: 600; cursor: pointer; color: inherit; }
.acc-tidy-name:hover { text-decoration: underline; }
.acc-tidy-note { margin-top: 14px; }
.acc-slot { display: flex; align-items: center; gap: 14px; padding: 8px 10px 8px 8px; flex: 0 1 300px; min-width: 0; border-radius: 8px; border: 1.5px dashed rgba(255,255,255,.22); color: var(--acc-sub); cursor: help; }
.acc-slot:hover { border-color: rgba(255,255,255,.45); color: var(--acc-text); }
.acc-slot-plus { width: 56px; height: 56px; flex: none; border-radius: 4px; display: grid; place-items: center; border: 1.5px dashed rgba(255,255,255,.22); font-size: 1.5rem; font-weight: 300; }
.acc-slot .acc-liked-title { color: inherit; }
.acc-update { background: rgba(30,215,96,.12); color: #c9f5da; }
.acc-update a { color: #fff; }
.acc-pin-hint { display: flex; align-items: center; max-width: 320px; padding: 10px 14px; border: 1px dashed rgba(255,255,255,.2); border-radius: 8px; color: var(--acc-sub); font-size: .8125rem; }
/* Une seule ligne, toujours : 3 cartes (2 épingles + Titres likés), qui rétrécissent au besoin. */
.acc-heroes { display: flex; gap: 12px; flex-wrap: nowrap; justify-content: flex-end; flex: 1 1 auto; min-width: 0; }
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
.acc-liked[draggable="true"] { cursor: grab; }
.acc-liked.is-dragging { opacity: .4; }
.acc-liked.is-drop-before { box-shadow: inset 3px 0 0 var(--acc-green); }
.acc-liked.is-drop-after { box-shadow: inset -3px 0 0 var(--acc-green); }
.acc-liked.is-drop { background: var(--acc-chip-hover); box-shadow: inset 0 0 0 2px var(--acc-green); }
.acc-tile.is-drop .acc-tile-img::after { content: ""; position: absolute; inset: 0; border: 3px solid var(--acc-green); border-radius: inherit; pointer-events: none; }
.acc-tile.is-drop .acc-tile-img img { filter: brightness(.6); }
.acc-alert { margin-bottom: 20px; padding: 12px 16px; border-radius: 8px; background: rgba(245,158,11,.14); color: #fcd9a0; font-size: .875rem; line-height: 1.45; }
.acc-alert a { color: inherit; text-decoration: underline; }
.acc-more { display: flex; justify-content: center; margin-top: 16px; }
`;
