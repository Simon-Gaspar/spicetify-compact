# Compact — thème Spicetify

![Aperçu](preview.png)

Pour **Spotify sur ordinateur, version téléchargée sur spotify.com** (pas celle du Microsoft Store ni du Mac App Store). Fait pour Spotify 1.3 et Spicetify 2.45.

## Ce que ça change
- **Accueil sur mesure** : onglets Musique / Podcasts. Mes playlists en trois colonnes (les tiennes, celles des autres, celles de Spotify), Mes albums, Mix, Nouveautés, Découvrir. Filtres par style avec un ▶ pour lancer tout un style, nombre d'écoutes, titres likés en un clic.
- **Glisser-déposer** : fais glisser un titre (barre du lecteur, file d'attente, activité d'écoute…) sur « Titres likés » pour le liker, sur la carte de la saison ou sur une de tes playlists pour l'y ajouter (sans doublon).
- **Lecture plein écran** : bouton plein écran de la barre du lecteur (ou ⤢ du panneau En cours de lecture), pochette en grand, paroles synchronisées et liste « À suivre ». Échap pour fermer.
- **Écouter plus tard** : clic droit sur un titre, un album, une playlist ou un artiste → « Écouter plus tard » (ou l'horloge dans la vue Lecture) pour le mettre de côté sans le liker. Onglet « Plus tard » de l'accueil : ce qui a été joué est marqué « Écouté ». Liste gardée sur cet ordinateur uniquement.
- **Discographie complète** : clic droit sur un artiste, un album ou un titre → « Discographie complète » : toutes les sorties de l'artiste, filtrables (albums, EP, singles, compilations, déjà dans ta bibliothèque) et triables par date.
- **Mes albums par date de sortie** : tris « Sortie ↓ » et « Sortie ↑ » (dates lues une fois, puis gardées en cache).
- **Épingles de l'accueil** : clic droit sur une playlist, un album, un artiste ou une émission → « Épingler sur l'accueil » pour l'afficher en carte en haut de la page (« Retirer de l'accueil », ou la croix au survol, pour l'enlever). Au premier lancement, la liste reprend les épingles de ta bibliothèque Spotify ; la saison en cours y est tenue à jour.
- **Clic droit partout** : les cartes de l'accueil (playlists, albums, mix, discographie, « Plus tard ») et la file « À suivre » ouvrent le vrai menu de Spotify.
- Panneau de gauche masqué, interface épurée (bouton « Studio » retiré), bibliothèque plus dense.

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

## En cas de souci
Spicetify rate parfois son initialisation au lancement de Spotify (écran « Something went wrong », ou accueil incomplet) : le thème recharge alors l'interface tout seul, jusqu'à 3 fois. Si ça persiste, quitte et relance Spotify.
Si une mise à jour de Spotify casse une API interne utilisée par le thème, un bandeau le signale en haut de l'accueil (avec une notification une fois par version). Détails dans la console : `spicetify enable-devtools`, puis messages `[accueil]`.

## Désinstaller, mises à jour
Revenir au Spotify d'origine : `spicetify restore`.
Après une mise à jour de Spotify, les modifications sautent : relancer `spicetify backup apply` (dans PowerShell ou le Terminal).

## À adapter à ta bibliothèque
- **Styles** : un style = un dossier de premier niveau de ta bibliothèque, détecté automatiquement (sauf `SAISONS`). Pour ne garder que certains dossiers ou changer leur nom affiché, édite `STYLE_LABELS` au début de `CustomApps/accueil/index.js` (dans `%APPDATA%\spicetify` sous Windows, `~/.config/spicetify` sur Mac), puis `spicetify apply` : dès qu'un dossier de cette liste existe, seuls ceux de la liste comptent. L'analyse est refaite chaque semaine.
- **Saisons automatiques** (création de « automne '26 », etc.) : ne s'activent que si tu as un dossier `SAISONS` à la racine de ta bibliothèque. Sans ce dossier, rien n'est créé.

Spicetify modifie l'app Spotify, ce que les conditions d'utilisation de Spotify n'autorisent pas (ce n'est quasiment jamais appliqué). À utiliser en connaissance de cause.
