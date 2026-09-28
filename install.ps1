# Installe le thème Spotify de Simon (Windows) : Spicetify + thème Compact, page Accueil,
# vue Lecture plein écran. Réversible avec : spicetify restore
# À lancer en utilisateur normal (pas en administrateur), via install.cmd.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "$env:APPDATA\Spotify\Spotify.exe")) {
  Write-Host "Spotify introuvable. Installe la version de spotify.com (pas celle du Microsoft Store), puis relance." -ForegroundColor Red
  exit 1
}

# Spicetify : installeur officiel (github.com/spicetify/cli). Répondre N à la question sur le Marketplace.
if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
  Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/spicetify/cli/main/install.ps1" | Invoke-Expression
  $env:Path += ";$env:LOCALAPPDATA\spicetify"
}

spicetify config | Out-Null   # génère la configuration au premier lancement
$cfg = "$env:APPDATA\spicetify"
New-Item -ItemType Directory -Force $cfg | Out-Null
Copy-Item -Recurse -Force "spicetify\Themes", "spicetify\CustomApps", "spicetify\Extensions" $cfg

spicetify config current_theme Compact replace_colors 0 inject_theme_js 0 inject_css 1
spicetify config custom_apps accueil custom_apps lecture extensions accueil-core.js extensions lecture-core.js

# Patch de la hauteur de ligne du panneau Bibliothèque (64 -> 48 px), une seule fois
$ini = "$cfg\config-xpui.ini"
$text = [IO.File]::ReadAllText($ini)
if ($text -notmatch 'xpui-routes-your-library-x\.js_find_0') {
  $patch = @(
    '[Patch]',
    'xpui-routes-your-library-x.js_find_0 = (LIST_DEFAULT\|\|\w+)\?64:32',
    'xpui-routes-your-library-x.js_repl_0 = ${1}?48:32'
  ) -join "`r`n"
  $re = [regex]'\[Patch\]\r?\n'
  $text = $re.Replace($text, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $patch + "`r`n" }, 1)
  [IO.File]::WriteAllText($ini, $text)
}

spicetify backup apply
Write-Host "Terminé. Après chaque mise à jour de Spotify, relance : spicetify backup apply" -ForegroundColor Green
