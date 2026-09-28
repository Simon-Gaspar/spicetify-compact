# Compact — thème Spicetify

![Aperçu](preview.png)

Pour **Spotify sur ordinateur, version téléchargée sur spotify.com** (pas celle du Microsoft Store ni du Mac App Store). Fait pour Spotify 1.3 et Spicetify 2.45.

## Ce que ça change
- **Accueil sur mesure** : onglets Musique / Podcasts. Mes playlists en trois colonnes (les tiennes, celles des autres, celles de Spotify), Mes albums, Mix, Nouveautés, Découvrir. Filtres par style avec un ▶ pour lancer tout un style, nombre d'écoutes, titres likés en un clic.
- **Lecture plein écran** : bouton à droite de la barre du lecteur, pochette en grand et liste « À suivre ». Échap pour fermer.
- Panneau de gauche masqué, interface épurée, bibliothèque plus dense.

## Installer

### Installation complète (recommandée)
La page Accueil et la vue Lecture sont des *custom apps* : le Marketplace ne sait pas les installer, il faut passer par le script.

Télécharger le dépôt (bouton **Code → Download ZIP**) et le dézipper, ou :
```bash
git clone https://github.com/Simon-Gaspar/spicetify-compact.git
```

**Mac** : ouvrir le Terminal dans le dossier et lancer `./install.sh` (Homebrew requis).

**Windows**
1. Double-cliquer sur `install.cmd` (sans le lancer en administrateur). Si Windows affiche « Windows a protégé votre ordinateur », cliquer sur « Informations complémentaires » puis « Exécuter quand même ».
2. Si l'installeur de Spicetify demande d'installer le Marketplace, répondre **N**.

### Depuis le Marketplace
Installe seulement le thème et les extensions : bibliothèque compacte (si le patch de `install.sh` est en place). Sans les custom apps, le panneau de gauche et l'accueil natif restent en place.

## Désinstaller, mises à jour
Revenir au Spotify d'origine : `spicetify restore`.
Après une mise à jour de Spotify, les modifications sautent : relancer `spicetify backup apply` (dans PowerShell ou le Terminal).

## À adapter à ta bibliothèque
- **Styles** : ils sont déduits de dossiers de genre nommés exactement `ELECTRO`, `HIP-HOP / RAP`, `JAZZ / BLUES`, `SOUL / FUNK`, `INDIE / TRIP-HOP`, `CLASSIQUE`. Soit tu ranges tes playlists dans des dossiers à ces noms, soit tu modifies la liste `STYLE_FOLDERS` au début de `CustomApps/accueil/index.js` (dans `%APPDATA%\spicetify` sous Windows, `~/.config/spicetify` sur Mac), puis `spicetify apply`.
- **Saisons automatiques** (création de « automne '26 », etc.) : ne s'activent que si tu as un dossier `SAISONS` à la racine de ta bibliothèque. Sans ce dossier, rien n'est créé.

Spicetify modifie l'app Spotify, ce que les conditions d'utilisation de Spotify n'autorisent pas (ce n'est quasiment jamais appliqué). À utiliser en connaissance de cause.
