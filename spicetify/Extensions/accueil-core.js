// Accueil — extension compagnon de la custom app « accueil »
// 1. Redirige l'accueil natif de Spotify (« / ») vers la page sur mesure.
// 2. Compte les écoutes des playlists et albums : une écoute = une fois où l'élément a été lancé.
//    Source : lastPlayedAt de la bibliothèque, synchronisé par Spotify entre les appareils.
//    Les écoutes espacées de moins de 30 min comptent pour une ; plusieurs lancements
//    d'un même élément entre deux synchros ne comptent qu'une fois.
// 3. Saisons : au début de chaque saison astronomique, crée « automne '26 » (etc.), l'épingle,
//    et range la saison précédente dans le dossier SAISONS. Une seule fois par saison.
// 4. N'active le CSS compact du panneau (thème Compact) que si le patch 64 → 48 px est en place.
// 5. Vérifie les API internes de Spotify dont dépend le thème et signale celles qui manquent
//    (elles changent parfois avec les mises à jour de Spotify).
(function accueilCore(tries = 0) {
  const missingOf = (list) => list.filter(([, get]) => { try { return !get(); } catch { return true; } }).map(([name]) => name);
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
      Spicetify.showNotification?.(`Thème Compact : API Spotify introuvables (${base.join(", ")}), l'accueil ne peut pas démarrer`, true);
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
    window.dispatchEvent(new Event("accueil:season"));
    const moved = previous.map((p) => p.name).join(", ");
    Spicetify.showNotification?.(`${created ? "Nouvelle saison : " + name + " créée et épinglée" : name + " épinglée"}${moved ? " · " + moved + " rangée dans SAISONS" : ""}`);
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
    const missing = missingOf(FEATURES);
    window.AccueilCore.missing = missing;
    window.dispatchEvent(new Event("accueil:health"));
    if (!missing.length) return;
    console.warn("[accueil] fonctions touchées par un changement d'API Spotify :", missing.join(", "));
    const key = `${P().version || "?"}|${missing.join(",")}`;
    if (Spicetify.LocalStorage.get("accueil:health") === key) return;
    Spicetify.LocalStorage.set("accueil:health", key);
    Spicetify.showNotification?.(`Thème Compact : Spotify a changé des API internes (${missing.join(", ")})`, true);
  }, 10000);
})();
