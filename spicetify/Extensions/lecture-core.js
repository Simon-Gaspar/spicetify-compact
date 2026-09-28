// Lecture — ajoute à la barre du lecteur le bouton qui ouvre la vue plein écran (custom app « lecture »).
// Remplace le bouton plein écran natif, masqué dans Themes/Compact/user.css.
(function lectureCore() {
  if (!Spicetify?.Playbar?.Button || !Spicetify.Platform?.History) {
    setTimeout(lectureCore, 300);
    return;
  }
  // width/height explicites : sans eux, le SVG fait 0 × 0 dans la barre du lecteur.
  const icon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>';
  const toggle = () => {
    const H = Spicetify.Platform.History;
    if (H.location.pathname === "/lecture") H.goBack();
    else H.push("/lecture");
  };
  // Seulement si la custom app « lecture » est installée ; acc-lecture masque alors le plein écran natif.
  fetch("/spicetify-routes-lecture.js")
    .then((r) => {
      if (!r.ok) return;
      document.body.classList.add("acc-lecture");
      const button = new Spicetify.Playbar.Button("Lecture plein écran", icon, toggle, false, false, true);
      button.element.setAttribute("aria-label", "Lecture plein écran");
    })
    .catch(() => {});
})();
