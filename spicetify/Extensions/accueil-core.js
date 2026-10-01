// Accueil — extension compagnon de la custom app « accueil »
// 1. Redirige l'accueil natif de Spotify (« / ») vers la page sur mesure.
// 2. Compte les écoutes des playlists et albums : une écoute = une fois où l'élément a été lancé.
//    Source : lastPlayedAt de la bibliothèque, synchronisé par Spotify entre les appareils.
//    Les écoutes espacées de moins de 30 min comptent pour une ; plusieurs lancements
//    d'un même élément entre deux synchros ne comptent qu'une fois.
// 3. Saisons : au début de chaque saison astronomique, crée « automne '26 » (etc.), l'épingle,
//    et range la saison précédente dans le dossier SAISONS. Une seule fois par saison.
// 4. N'active le CSS compact du panneau (thème Compact) que si le patch 64 → 48 px est en place.
// 6. « Écouter plus tard » et « Discographie complète » dans le menu clic droit.
// 9. Avis de mise à jour : compare ACCUEIL_VERSION à version.json du dépôt GitHub (une fois par jour).
// 8. Épingles de l'accueil : playlists, albums, dossiers, artistes ou émissions affichés en haut
//    de la page, choisis au clic droit (« Épingler sur l'accueil »).
// 10. Statistiques d'écoute : chaque titre ou épisode joué est noté (durée réellement écoutée, passé
//    ou non) dans une base IndexedDB locale, lue par l'onglet Stats de l'accueil.
// 5. Vérifie les API internes de Spotify dont dépend le thème et signale celles qui manquent
//    (elles changent parfois avec les mises à jour de Spotify).
// Version installée du thème : à incrémenter avec version.json à la racine du dépôt à chaque publication.
const ACCUEIL_VERSION = "1.3.0";

// Langue : français si Spotify est en français, anglais sinon ; accueil:lang ("fr" | "en") force une
// langue. Calculée à chaque appel (Spicetify.Locale n'est pas toujours prêt au démarrage).
const ACCUEIL_EN = {
  "Écouter plus tard": "Listen later",
  "Retirer de « Plus tard »": "Remove from Later",
  "Épingler sur l'accueil": "Pin to home",
  "Retirer de l'accueil": "Unpin from home",
  "Discographie complète": "Full discography",
  "Épinglé sur l'accueil": "Pinned to home",
  "Accueil complet (3 emplacements, Titres likés compris) : retire une épingle d'abord": "Home is full (3 slots, Liked Songs included): unpin one first",
  "Ajouté à « Plus tard »": "Added to Later",
  "{n} éléments ajoutés à « Plus tard »": "{n} items added to Later",
  "Déjà dans « Plus tard »": "Already in Later",
  "Discographie indisponible : {error}": "Discography unavailable: {error}",
  "Thème Compact : API Spotify introuvables ({list}), l'accueil ne peut pas démarrer": "Compact theme: Spotify APIs not found ({list}), the home page can't start",
  "Thème Compact : Spotify a changé des API internes ({list})": "Compact theme: Spotify changed some internal APIs ({list})",
  "Nouvelle saison : {name} créée et épinglée": "New season: {name} created and pinned",
  "{name} épinglée": "{name} pinned",
  " · {moved} rangée dans SAISONS": " · {moved} filed in SAISONS",
  "Artiste": "Artist",
  "artiste introuvable": "artist not found",
  "type non pris en charge": "unsupported type",
  "accueil Spotify": "Spotify home",
  "bibliothèque": "library",
  "saisons": "seasons",
  "lecture": "playback",
  "file d'attente": "queue",
};
function accueilLang() {
  try { const forced = Spicetify.LocalStorage?.get("accueil:lang"); if (forced === "fr" || forced === "en") return forced; } catch {}
  return String(Spicetify.Locale?.getLocale?.() || navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}
function accueilT(fr, vars) {
  let text = accueilLang() === "en" && ACCUEIL_EN[fr] !== undefined ? ACCUEIL_EN[fr] : fr;
  if (vars) text = text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return text;
}

(function accueilCore(tries = 0) {
  const missingOf = (list) => list.filter(([, get]) => { try { return !get(); } catch { return true; } }).map(([name]) => accueilT(name));
  const BASE = [
    ["History", () => Spicetify.Platform.History],
    ["LibraryAPI", () => Spicetify.Platform.LibraryAPI],
    ["RootlistAPI", () => Spicetify.Platform.RootlistAPI],
    ["Player", () => Spicetify.Player.addEventListener],
    ["LocalStorage", () => Spicetify.LocalStorage],
  ];
  const base = missingOf(BASE);
  if (base.length) {
    // ~20 s sans ces API : ce n'est plus un chargement lent, Spotify les a changées.
    if (tries === 66) {
      console.warn("[accueil] API introuvables :", base.join(", "));
      Spicetify.showNotification?.(accueilT("Thème Compact : API Spotify introuvables ({list}), l'accueil ne peut pas démarrer", { list: base.join(", ") }), true);
    }
    setTimeout(() => accueilCore(tries + 1), 300);
    return;
  }
  const warn = (where) => (e) => console.warn("[accueil]", where, e);

  // ---------- 1. redirection ----------
  // Seulement si la custom app « accueil » est installée (le Marketplace n'installe que le thème
  // et les extensions) : sinon on garderait un accueil vide et aucun panneau de navigation.
  // La classe acc-app active dans le thème le retrait du panneau de gauche.
  const History = Spicetify.Platform.History;
  fetch("/spicetify-routes-accueil.js")
    .then((r) => {
      if (!r.ok) return;
      document.body.classList.add("acc-app");
      // Réglages propres au Mac dans le thème (boutons de fenêtre à gauche).
      if (/Mac/i.test(navigator.platform || navigator.userAgent)) document.body.classList.add("acc-mac");
      const redirect = (arg) => {
        const loc = arg?.location ?? arg;
        if (loc && (loc.pathname === "/" || loc.pathname === "/home")) History.replace("/accueil");
      };
      redirect(History.location);
      History.listen(redirect);
    })
    .catch(() => {});

  // ---------- 2. compteur d'écoutes ----------
  const KEY = "accueil:plays";
  const SYNC_EVERY = 15 * 60 * 1000;
  const MIN_GAP = 2 * 60 * 1000;
  const SESSION_GAP = 30 * 60 * 1000;
  let lastSync = 0;

  const load = () => {
    try { return JSON.parse(Spicetify.LocalStorage.get(KEY) || "{}"); } catch { return {}; }
  };

  async function recentItems() {
    const L = Spicetify.Platform.LibraryAPI;
    const sortOrder = L.getRecentsSortOrderId?.() ?? "6";
    const [playlists, albums] = await Promise.all([
      L.getContents({ filters: ["2"], sortOrder, flattenTree: true, limit: 80 }),
      L.getContents({ filters: ["0"], sortOrder, limit: 40 }),
    ]);
    return [...(playlists.items || []), ...(albums.items || [])].filter((i) => (i.type === "playlist" || i.type === "album") && i.lastPlayedAt);
  }

  async function sync() {
    if (Date.now() - lastSync < MIN_GAP) return;
    lastSync = Date.now();
    let items;
    try { items = await recentItems(); } catch (e) { warn("écoutes")(e); return; }

    let plays = load();
    if (plays._v !== 2) {
      // Migration depuis le compteur par titre : on repart sur des lancements.
      const since = plays._since ?? Date.now();
      plays = { _v: 2, _since: since };
      for (const i of items) {
        const t = Date.parse(i.lastPlayedAt);
        plays[i.uri] = { n: t >= since ? 1 : 0, last: t };
      }
    } else {
      for (const i of items) {
        const t = Date.parse(i.lastPlayedAt);
        const e = plays[i.uri];
        if (!e) plays[i.uri] = { n: t >= plays._since ? 1 : 0, last: t };
        else if (t > e.last) {
          // lastPlayedAt avance à chaque titre : on ne compte qu'une reprise après une pause
          if (t - e.last > SESSION_GAP) e.n += 1;
          e.last = t;
        }
      }
    }
    Spicetify.LocalStorage.set(KEY, JSON.stringify(plays));
    window.dispatchEvent(new Event("accueil:plays"));
  }

  sync();
  setInterval(() => { lastSync = 0; sync(); }, SYNC_EVERY);
  Spicetify.Player.addEventListener("songchange", () => setTimeout(sync, 5000));

  // ---------- 3. saisons ----------
  // Débuts astronomiques (mois 0-indexé, jour). L'hiver porte l'année de son mois de janvier :
  // l'hiver qui commence en décembre 2026 s'appelle « hiver '27 ».
  function currentSeason(d = new Date()) {
    const y = d.getFullYear();
    const after = (month, day) => d.getMonth() > month || (d.getMonth() === month && d.getDate() >= day);
    let name = "hiver", year = y;
    if (after(11, 21)) year = y + 1;
    else if (after(8, 22)) name = "automne";
    else if (after(5, 21)) name = "été";
    else if (after(2, 20)) name = "printemps";
    return `${name} '${String(year).slice(-2)}`;
  }
  const normName = (s) => s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/\s+/g, "");
  const SEASON_RE = /^(hiver|printemps|été|automne)\s*['‘’`´]\s*\d{2}$/i;
  const SEASON_DONE = "accueil:season";

  async function seasonCheck() {
    const name = currentSeason();
    if (Spicetify.LocalStorage.get(SEASON_DONE) === name) return;
    const R = Spicetify.Platform.RootlistAPI;
    const L = Spicetify.Platform.LibraryAPI;
    const findRoot = async () => (await R.getContents({})).items;
    let root = await findRoot();
    const folder = root.find((i) => i.type === "folder" && i.name === "SAISONS");
    if (!folder) return;

    const all = [];
    (function walk(items) { for (const i of items) { if (i.type === "playlist") all.push(i); if (i.items) walk(i.items); } })(root);
    let current = all.find((p) => normName(p.name || "") === normName(name));
    const created = !current;
    if (!current) {
      await R.createPlaylist(name, { before: "start" });
      root = await findRoot();
      current = root.find((p) => p.type === "playlist" && normName(p.name || "") === normName(name));
      if (!current) return;
    }

    const previous = root.filter((i) => i.type === "playlist" && SEASON_RE.test((i.name || "").trim()) && i.uri !== current.uri);
    for (const p of previous) {
      await R.move([p], { after: { uri: folder.uri } });
      try { await L.unpin(p.uri); } catch {}
    }
    try { await L.pin(current.uri); } catch {}

    Spicetify.LocalStorage.set(SEASON_DONE, name);
    seasonPins(current.uri, previous.map((p) => p.uri));
    window.dispatchEvent(new Event("accueil:season"));
    const moved = previous.map((p) => p.name).join(", ");
    Spicetify.showNotification?.((created ? accueilT("Nouvelle saison : {name} créée et épinglée", { name }) : accueilT("{name} épinglée", { name })) + (moved ? accueilT(" · {moved} rangée dans SAISONS", { moved }) : ""));
  }

  window.AccueilCore = { currentSeason, normName, missing: [] };
  seasonCheck().catch(warn("saisons"));
  setInterval(() => seasonCheck().catch(warn("saisons")), 6 * 3600 * 1000);

  // ---------- 4. garde-fou du panneau compact ----------
  // Le CSS réduit les lignes à 48 px ; il ne doit s'appliquer que si la liste virtualisée
  // a été patchée à la même hauteur, sinon les lignes se décalent.
  fetch("/xpui-routes-your-library-x.js")
    .then((r) => r.text())
    .then((js) => { if (/LIST_DEFAULT\|\|\w+\?48:32/.test(js)) document.body.classList.add("acc-compact-rows"); })
    .catch(() => {});

  // ---------- 5. santé ----------
  // Utilisées par l'accueil et la vue Lecture. Vérifiées après 10 s : certaines (GraphQL)
  // se remplissent après le démarrage. La page Accueil affiche la liste (window.AccueilCore.missing) ;
  // la notification ne sort qu'une fois par version de Spotify.
  const P = () => Spicetify.Platform;
  const FEATURES = [
    ["accueil Spotify", () => Spicetify.GraphQL.Definitions.home],
    ["bibliothèque", () => P().LibraryAPI.getContents],
    ["likes", () => P().LibraryAPI.add && P().LibraryAPI.contains],
    ["playlists", () => P().PlaylistAPI.getContents && P().PlaylistAPI.add],
    ["saisons", () => P().RootlistAPI.createPlaylist && P().RootlistAPI.move && P().LibraryAPI.pin],
    ["lecture", () => P().PlayerAPI.play && Spicetify.Player.playUri],
    ["file d'attente", () => Spicetify.Queue && P().PlayerAPI.skipTo],
  ];
  setTimeout(() => {
    // Spicetify rate parfois son initialisation (erreur dans _renderNavLinks, React pas encore prêt) :
    // GraphQL.Request, URI et Queue ne sont alors jamais exposés, et l'erreur peut faire tomber toute
    // l'interface (« Something went wrong », plus de #main-view). Constaté au lancement comme au
    // rechargement, au hasard ; recharger l'interface finit par passer. Au plus 3 fois par session.
    const reloads = +(sessionStorage.getItem("accueil:reloads") || 0);
    const broken = typeof Spicetify.GraphQL?.Request !== "function" || !Spicetify.URI?.fromString || !document.querySelector("#main-view");
    if (broken && reloads < 3) {
      sessionStorage.setItem("accueil:reloads", String(reloads + 1));
      console.warn("[accueil] initialisation de Spicetify incomplète, rechargement", reloads + 1, "/ 3");
      location.reload();
      return;
    }
    const missing = missingOf(FEATURES);
    window.AccueilCore.missing = missing;
    window.dispatchEvent(new Event("accueil:health"));
    if (!missing.length) return;
    console.warn("[accueil] fonctions touchées par un changement d'API Spotify :", missing.join(", "));
    const key = `${P().version || "?"}|${missing.join(",")}`;
    if (Spicetify.LocalStorage.get("accueil:health") === key) return;
    Spicetify.LocalStorage.set("accueil:health", key);
    Spicetify.showNotification?.(accueilT("Thème Compact : Spotify a changé des API internes ({list})", { list: missing.join(", ") }), true);
  }, 10000);

  // ---------- 6. écouter plus tard, discographie ----------
  // Liste « plus tard » : titres, albums, playlists ou artistes mis de côté sans les liker.
  // Stockée localement (accueil:later) ; un élément joué est marqué « écouté ».
  const LATER = "accueil:later";
  const readLater = () => { try { return JSON.parse(Spicetify.LocalStorage.get(LATER) || "[]"); } catch { return []; } };
  const writeLater = (list) => {
    Spicetify.LocalStorage.set(LATER, JSON.stringify(list));
    window.dispatchEvent(new Event("accueil:later"));
  };
  const token = () => Spicetify.Platform.AuthorizationAPI.getState().token.accessToken;
  const spMeta = async (kind, id) => {
    const r = await fetch(`https://spclient.wg.spotify.com/metadata/4/${kind}/${Spicetify.URI.idToHex(id)}?market=from_token`,
      { headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" } });
    if (!r.ok) throw new Error(`métadonnées ${kind} : HTTP ${r.status}`);
    return r.json();
  };
  const image = (group) => {
    const f = group?.image?.find((i) => i.size === "DEFAULT") || group?.image?.[0];
    return f ? `https://i.scdn.co/image/${f.file_id}` : null;
  };
  const artistNames = (j) => (j.artist || []).map((a) => a.name).join(", ");

  async function describe(uri) {
    const [, type, id] = uri.split(":");
    if (type === "track") { const j = await spMeta("track", id); return { name: j.name, sub: artistNames(j), img: image(j.album?.cover_group), kind: "track" }; }
    if (type === "album") { const j = await spMeta("album", id); return { name: j.name, sub: artistNames(j), img: image(j.cover_group), kind: "album" }; }
    if (type === "artist") { const j = await spMeta("artist", id); return { name: j.name, sub: accueilT("Artiste"), img: image(j.portrait_group), kind: "artist", round: true }; }
    if (type === "playlist") {
      const m = await Spicetify.Platform.PlaylistAPI.getMetadata(uri);
      return { name: m.name, sub: m.owner?.displayName || "Playlist", img: m.images?.[0]?.url || null, kind: "playlist" };
    }
    throw new Error(accueilT("type non pris en charge"));
  }

  async function addLater(uris) {
    const list = readLater();
    const fresh = uris.filter((u) => !list.some((i) => i.uri === u));
    const described = await Promise.all(fresh.map((uri) => describe(uri).then((d) => ({ uri, ...d, addedAt: Date.now() }), (e) => { warn("plus tard")(e); return null; })));
    const added = described.filter(Boolean);
    if (added.length) writeLater([...added, ...readLater()]);
    Spicetify.showNotification?.(added.length ? (added.length > 1 ? accueilT("{n} éléments ajoutés à « Plus tard »", { n: added.length }) : accueilT("Ajouté à « Plus tard »")) : accueilT("Déjà dans « Plus tard »"));
  }
  const removeLater = (uris) => writeLater(readLater().filter((i) => !uris.includes(i.uri)));
  const inLater = (uri) => readLater().some((i) => i.uri === uri);

  // Marque « écouté » ce qui passe en lecture (le titre, ou l'album / la playlist lancés).
  Spicetify.Player.addEventListener("songchange", () => {
    const d = Spicetify.Player.data;
    const hits = [d?.item?.uri, d?.context?.uri].filter(Boolean);
    const list = readLater();
    if (!list.some((i) => hits.includes(i.uri) && !i.played)) return;
    writeLater(list.map((i) => (hits.includes(i.uri) ? { ...i, played: Date.now() } : i)));
  });

  // Discographie : page /accueil/discographie/<id> de la custom app ; depuis un titre ou un album,
  // on passe par son artiste principal.
  async function artistOf(uri) {
    const [, type, id] = uri.split(":");
    if (type === "artist") return id;
    // GraphQL d'abord (getTrack / getAlbum), métadonnées spclient en secours.
    try {
      const G = Spicetify.GraphQL;
      const r = type === "track"
        ? await G.Request(G.Definitions.getTrack, { uri })
        : await G.Request(G.Definitions.getAlbum, { uri, locale: "", offset: 0, limit: 1 });
      const a = type === "track" ? r?.data?.trackUnion?.firstArtist?.items?.[0]?.uri : r?.data?.albumUnion?.artists?.items?.[0]?.uri;
      if (a) return a.split(":")[2];
    } catch (e) { warn("discographie : artiste (GraphQL)")(e); }
    const j = await spMeta(type, id);
    const gid = j.artist?.[0]?.gid;
    if (!gid) throw new Error(accueilT("artiste introuvable"));
    return Spicetify.URI.hexToId(gid);
  }

  const LATER_TYPES = /^spotify:(track|album|playlist|artist):/;
  const clock = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.5V8l2.5 1.5"/></svg>';
  const disc = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.25"/><circle cx="8" cy="8" r="1.75"/></svg>';
  // Enregistrées trop tôt, les entrées sont perdues (Spicetify remet en place son registre de menus
  // pendant son initialisation) : on attend que l'interface soit prête (~20 s max).
  const PIN_TYPES = /^spotify:(playlist|album|artist|show):|:folder:/;
  const pinIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9.5 1.75 14.25 6.5l-2 .75-2.5 2.5-.5 3.5L2.75 6.75l3.5-.5 2.5-2.5z"/><path d="M5.25 10.75 1.75 14.25"/></svg>';
  const registerMenus = (tries = 0) => {
    const ready = Spicetify.ContextMenu?.Item && typeof Spicetify.GraphQL?.Request === "function" && document.querySelector("#main-view");
    if (!ready) {
      if (tries < 66) setTimeout(() => registerMenus(tries + 1), 300);
      else console.warn("[accueil] Spicetify.ContextMenu introuvable : pas d'entrées clic droit");
      return;
    }
    new Spicetify.ContextMenu.Item(accueilT("Écouter plus tard"), (uris) => addLater(uris).catch(warn("plus tard")),
      (uris) => uris.every((u) => LATER_TYPES.test(u)) && !uris.every(inLater), clock).register();
    new Spicetify.ContextMenu.Item(accueilT("Retirer de « Plus tard »"), (uris) => removeLater(uris),
      (uris) => uris.every(inLater), clock).register();
    new Spicetify.ContextMenu.Item(accueilT("Épingler sur l'accueil"), (uris) => pinUri(uris[0]),
      (uris) => uris.length === 1 && PIN_TYPES.test(uris[0]) && !isPinned(uris[0]), pinIcon).register();
    new Spicetify.ContextMenu.Item(accueilT("Retirer de l'accueil"), (uris) => unpinUri(uris[0]),
      (uris) => uris.length === 1 && isPinned(uris[0]), pinIcon).register();
    new Spicetify.ContextMenu.Item(accueilT("Discographie complète"), (uris) => artistOf(uris[0]).then(
      (id) => History.push(`/accueil/discographie/${id}`),
      (e) => { warn("discographie")(e); Spicetify.showNotification?.(accueilT("Discographie indisponible : {error}", { error: e?.message || e }), true); }),
      (uris) => uris.length === 1 && /^spotify:(artist|album|track):/.test(uris[0]), disc).register();
  };
  fetch("/spicetify-routes-accueil.js")
    .then((r) => { if (r.ok) registerMenus(); })
    .catch(() => {});

  // ---------- 7. menus clic droit ----------
  // Aiguilleur de la bibliothèque native : ({ item }) => menu complet selon item.type (playlist,
  // album, titre, artiste, épisode, émission…). Non exposé par Spicetify (son « PlaylistMenu » est
  // en fait le bouton « ajouter à une playlist ») : on le cherche une fois parmi les modules webpack.
  let itemMenu;
  function findItemMenu() {
    if (itemMenu !== undefined) return itemMenu;
    itemMenu = null;
    try {
      let req;
      window.webpackChunkclient_web.push([[Symbol("accueil")], {}, (r) => { req = r; }]);
      for (const id of Object.keys(req.m)) {
        let ex;
        try { ex = req(id); } catch { continue; }
        if (!ex || typeof ex !== "object") continue;
        for (const k of Object.keys(ex)) {
          let fn;
          try { fn = ex[k]; } catch { continue; }
          if (typeof fn !== "function") continue;
          const src = Function.prototype.toString.call(fn);
          if (src.length < 2000 && /^\(\{item:\w+\}\)=>\{switch\(\w+\.type\)\{case/.test(src) && src.includes(".PLAYLIST:") && src.includes(".ALBUM:")) {
            itemMenu = fn;
            return itemMenu;
          }
        }
      }
    } catch (e) { warn("menus")(e); }
    if (!itemMenu) console.warn("[accueil] menu clic droit natif introuvable, menus de secours");
    return itemMenu;
  }

  // ---------- 8. épingles de l'accueil ----------
  // Liste locale (accueil:pins) d'URI, dans l'ordre d'épinglage. Indépendante des épingles de la
  // bibliothèque Spotify (limitées en nombre, et invisibles dans un dossier). Déclarations
  // « function » : la saison (section 3) les appelle dès le démarrage.
  function readPins() {
    try { return JSON.parse(Spicetify.LocalStorage.get("accueil:pins") || "null"); } catch { return null; }
  }
  function writePins(list) {
    Spicetify.LocalStorage.set("accueil:pins", JSON.stringify(list));
    window.dispatchEvent(new Event("accueil:pins"));
  }
  // Nouvelle saison : elle prend la tête des épingles, les saisons précédentes en sortent.
  function seasonPins(current, previous) {
    const list = readPins();
    if (list) writePins([current, ...list.filter((u) => u !== current && !previous.includes(u))]);
  }
  // Onglet Musique : 3 emplacements, Titres likés compris, donc 2 épingles au choix. Les épingles de
  // podcasts (émissions, épisodes enregistrés) vont dans l'onglet Podcasts et ne comptent pas.
  const PIN_SLOTS = 2;
  async function pinUri(uri) {
    const list = readPins() || [];
    const podcast = (u) => /^spotify:(show|episode):/.test(u);
    if (!podcast(uri) && !list.includes(uri)) {
      let episodes = null;
      try { episodes = (await Spicetify.Platform.LibraryAPI.getContents({ limit: 50 })).items.find((i) => i.type === "your-episodes")?.uri; } catch {}
      const music = list.filter((u) => u !== "accueil:liked" && u !== episodes && !podcast(u));
      if (music.length >= PIN_SLOTS) {
        Spicetify.showNotification?.(accueilT("Accueil complet (3 emplacements, Titres likés compris) : retire une épingle d'abord"), true);
        return;
      }
    }
    // Titres likés (pseudo-épingle "accueil:liked") en dernier : la nouvelle épingle se place avant.
    if (!list.includes(uri)) writePins(list.at(-1) === "accueil:liked" ? [...list.slice(0, -1), uri, "accueil:liked"] : [...list, uri]);
    Spicetify.showNotification?.(accueilT("Épinglé sur l'accueil"));
  }
  function unpinUri(uri) { writePins((readPins() || []).filter((u) => u !== uri)); }
  function isPinned(uri) { return (readPins() || []).includes(uri); }

  // Premier lancement : on part des épingles de la bibliothèque Spotify.
  if (!readPins()) {
    Spicetify.Platform.LibraryAPI.getContents({ limit: 50 })
      .then((r) => { if (!readPins()) writePins((r.items || []).filter((i) => i.pinned).map((i) => i.uri)); })
      .catch(warn("épingles"));
  }

  // ---------- 9. avis de mise à jour ----------
  // Ne lit que version.json (rien n'est téléchargé ni exécuté) ; l'accueil affiche un bandeau si la
  // version publiée est plus récente. Résultat gardé un jour (accueil:update).
  const VERSION_URL = "https://raw.githubusercontent.com/Simon-Gaspar/spicetify-compact/main/version.json";
  const newer = (a, b) => {
    const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
    for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
    return false;
  };
  const publishUpdate = (latest) => {
    window.AccueilCore.update = { current: ACCUEIL_VERSION, latest, available: !!latest?.version && newer(latest.version, ACCUEIL_VERSION) };
    window.dispatchEvent(new Event("accueil:update"));
  };
  (async () => {
    let cached = null;
    try { cached = JSON.parse(Spicetify.LocalStorage.get("accueil:update") || "null"); } catch {}
    if (cached && Date.now() - cached.at < 86400000) return publishUpdate(cached.latest);
    try {
      const r = await fetch(VERSION_URL, { cache: "no-store" });
      if (!r.ok) return;
      const latest = await r.json();
      Spicetify.LocalStorage.set("accueil:update", JSON.stringify({ at: Date.now(), latest }));
      publishUpdate(latest);
    } catch (e) { warn("mise à jour")(e); }
  })();

  // ---------- 10. statistiques d'écoute ----------
  // Une écoute = un passage sur un titre ou un épisode, avec le temps réellement écouté (pauses
  // déduites, plafonné à la durée du morceau : une veille en pleine lecture ne gonfle rien). Le morceau
  // en cours est sauvé toutes les 15 s (accueil:stats-pending) et noté au démarrage suivant si Spotify
  // a été fermé avant la fin. Les écoutes faites sur un autre appareil comptent si cette app est ouverte
  // (Spotify Connect) ; sinon, l'import de l'historique étendu (onglet Stats) les rattrape.
  // Enregistrement : { k, t (fin, ms), ms, d (durée), u, n, a/an (artistes : uri/noms), al/aln (album),
  // img, c/cn (contexte : uri/nom), ty ("track" | "episode"), s (passé : moins de 30 s), src ("live" | "import") }.
  const STATS_DB = "accueil-stats";
  const PENDING_KEY = "accueil:stats-pending";
  let statsDb = null;
  const openStats = () => (statsDb ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(STATS_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("plays", { keyPath: "k" }).createIndex("t", "t");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { statsDb = null; reject(req.error); };
  }));
  const statsTx = async (mode, fn) => {
    const db = await openStats();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("plays", mode);
      const out = fn(tx.objectStore("plays"));
      tx.oncomplete = () => resolve(out?.result ?? out);
      tx.onerror = () => reject(tx.error);
    });
  };
  // quiet : pas d'événement (import en plusieurs lots : un seul signal à la fin, via statsAdd([])).
  const statsAdd = async (records, quiet) => {
    if (records.length) await statsTx("readwrite", (store) => { for (const r of records) store.put(r); });
    if (!quiet) window.dispatchEvent(new CustomEvent("accueil:stats", { detail: records }));
    return records.length;
  };
  const statsAll = () => statsTx("readonly", (store) => store.getAll());
  const statsRemove = (keys) => statsTx("readwrite", (store) => { for (const k of keys) store.delete(k); })
    .then(() => window.dispatchEvent(new CustomEvent("accueil:stats", { detail: [] })));

  const SKIP_MS = 30000; // seuil de Spotify pour compter une écoute
  const nowPlaying = () => {
    const d = Spicetify.Player.data;
    const it = d?.item || d?.track;
    if (!it?.uri || it.isLocal) return null;
    const ty = it.uri.startsWith("spotify:episode:") ? "episode" : it.uri.startsWith("spotify:track:") ? "track" : null;
    if (!ty) return null;
    const m = it.metadata || {};
    const artists = (it.artists || []).filter((a) => a?.name);
    const show = it.show || it.podcast;
    // Images : « spotify:image:<id> » étiquetées small / standard / large ; on garde la standard (300 px).
    const imgs = it.album?.images || it.images || [];
    const pick = (imgs.find((i) => i.label === "standard") || imgs[0])?.url || m.image_url || "";
    const img = pick.startsWith("spotify:image:") ? `https://i.scdn.co/image/${pick.slice(14)}` : pick;
    // Contexte : l'uri d'origine quand Spotify la donne (un artiste derrière « spotify:list:… Popular »).
    const ctx = d.context || {};
    return {
      u: it.uri, ty, n: it.name || m.title || "",
      d: it.duration?.milliseconds ?? (Number(m.duration) || 0),
      a: artists.map((a) => a.uri || ""), an: artists.length ? artists.map((a) => a.name) : [m.artist_name || show?.name || ""].filter(Boolean),
      al: it.album?.uri || show?.uri || m.album_uri || "", aln: it.album?.name || show?.name || m.album_title || "",
      img, c: ctx.metadata?.["reporting.uri"] || ctx.uri || "", cn: ctx.metadata?.context_description || "",
    };
  };
  let cur = null; // { ...nowPlaying(), acc, since }
  const played = (c) => c.acc + (c.since ? Date.now() - c.since : 0);
  const recordOf = (c, ms, end) => {
    const capped = c.d ? Math.min(ms, c.d) : ms;
    return { k: `${c.u}@${Math.floor(end / 1000)}`, t: end, ms: Math.round(capped), d: c.d, u: c.u, n: c.n, a: c.a, an: c.an, al: c.al, aln: c.aln, img: c.img, c: c.c, cn: c.cn, ty: c.ty,
      s: capped < SKIP_MS && (!c.d || c.d > SKIP_MS + 3000), src: "live" };
  };
  const commit = () => {
    const c = cur;
    cur = null;
    if (!c) return;
    const ms = played(c);
    if (ms >= 1500) statsAdd([recordOf(c, ms, Date.now())]).catch(warn("stats"));
  };
  // Morceau en cours lors de la dernière fermeture : repris s'il joue encore au redémarrage (moins de
  // 10 min après), sinon noté tel quel.
  let pending = null;
  try { pending = JSON.parse(Spicetify.LocalStorage.get(PENDING_KEY) || "null"); } catch {}
  Spicetify.LocalStorage.remove?.(PENDING_KEY);
  const begin = () => {
    const m = nowPlaying();
    let acc = 0;
    if (pending && m) {
      if (m.u === pending.u && Date.now() - pending.at < 600000) acc = pending.ms;
      else if (pending.u && pending.ms >= 1500) statsAdd([recordOf(pending, pending.ms, pending.at)]).catch(warn("stats"));
      pending = null;
    }
    cur = m ? { ...m, acc, since: Spicetify.Player.isPlaying() ? Date.now() : null } : null;
  };
  const onPlayPause = () => {
    if (!cur) return begin();
    const playing = Spicetify.Player.isPlaying();
    if (playing && !cur.since) cur.since = Date.now();
    else if (!playing && cur.since) { cur.acc += Date.now() - cur.since; cur.since = null; }
  };
  Spicetify.Player.addEventListener("songchange", () => { commit(); begin(); });
  Spicetify.Player.addEventListener("onplaypause", onPlayPause);
  setInterval(() => {
    if (!cur) return begin();
    try { Spicetify.LocalStorage.set(PENDING_KEY, JSON.stringify({ ...cur, ms: played(cur), at: Date.now() })); } catch {}
  }, 15000);
  begin();

  Object.assign(window.AccueilCore, { version: ACCUEIL_VERSION, statsAll, statsAdd, statsRemove, readLater, addLater, removeLater, inLater, findItemMenu, describe, readPins, pinUri, unpinUri, isPinned,
    setPins: (list) => { if (Array.isArray(list) && list.every((u) => typeof u === "string")) writePins(list); } });
})();
