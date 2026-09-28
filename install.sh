#!/bin/zsh
# Installe le thème Spotify de Simon (macOS). Réversible avec : spicetify restore
set -e
cd "$(dirname "$0")"
command -v brew >/dev/null || { echo "Homebrew est requis : https://brew.sh" >&2; exit 1; }
[[ -d /Applications/Spotify.app ]] || { echo "Installe d'abord Spotify pour Mac (version spotify.com)." >&2; exit 1; }
command -v spicetify >/dev/null || brew install spicetify-cli
spicetify config >/dev/null 2>&1 || true
CFG=~/.config/spicetify
mkdir -p "$CFG"
cp -R spicetify/Themes spicetify/CustomApps spicetify/Extensions "$CFG/"
spicetify config current_theme Compact replace_colors 0 inject_theme_js 0 inject_css 1
spicetify config custom_apps accueil custom_apps lecture extensions accueil-core.js extensions lecture-core.js
if ! grep -q 'xpui-routes-your-library-x.js_find_0' "$CFG/config-xpui.ini"; then
  perl -0pi -e 's/\[Patch\]\n/[Patch]\nxpui-routes-your-library-x.js_find_0 = (LIST_DEFAULT\\|\\|\\w+)\\?64:32\nxpui-routes-your-library-x.js_repl_0 = \${1}?48:32\n/' "$CFG/config-xpui.ini"
fi
yes | spicetify backup apply
echo "Terminé. Après chaque mise à jour de Spotify, relance : spicetify backup apply"
