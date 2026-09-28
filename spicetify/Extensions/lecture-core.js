// Lecture — fait ouvrir la vue plein écran (custom app « lecture ») aux boutons natifs de Spotify :
// le plein écran de la barre du lecteur et « Développer » du panneau En cours de lecture.
// Les boutons gardent leur apparence d'origine ; seul leur clic est détourné.
(function lectureCore() {
  if (!Spicetify.Platform?.History) {
    setTimeout(lectureCore, 300);
    return;
  }
  const toggle = () => {
    const H = Spicetify.Platform.History;
    if (H.location.pathname === "/lecture") H.goBack();
    else H.push("/lecture");
  };
  // Repérés sans l'aria-label, traduit selon la langue : data-testid pour le plein écran,
  // dernier bouton de l'en-tête (après « … ») pour « Développer ».
  const TARGETS = [
    '.Root__now-playing-bar button[data-testid="fullscreen-mode-button"]',
    ".main-nowPlayingView-headerButtonWrapper > button:last-of-type",
    'button[aria-label="Expand Now Playing view"]',
  ].join(", ");

  // Seulement si la custom app « lecture » est installée.
  fetch("/spicetify-routes-lecture.js")
    .then((r) => {
      if (!r.ok) return;
      // Phase de capture sur document : passe avant le gestionnaire React de Spotify.
      document.addEventListener("click", (e) => {
        if (!e.target.closest?.(TARGETS)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      }, true);
    })
    .catch(() => {});
})();
