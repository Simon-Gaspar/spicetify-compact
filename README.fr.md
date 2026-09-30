# Compact — thème Spicetify

[English](README.md) · **Français**

![Aperçu](preview.png)

Un Spotify centré sur **ta** bibliothèque : un accueil sur mesure à la place des recommandations, une vue de lecture plein écran avec paroles, et une interface débarrassée de ce qui ne sert pas.

Pour **Spotify sur ordinateur, version téléchargée sur spotify.com** (pas celle du Microsoft Store ni du Mac App Store), Mac ou Windows. Fait pour Spotify 1.3 et Spicetify 2.45.

## Ce que ça change

### Accueil
- **Onglets Musique / Podcasts & livres**, avec un sous-menu chacun : Mes playlists, Mes albums, Plus tard, Mix pour moi, Nouveautés, Découvrir ; et côté podcasts : nouveaux épisodes, à reprendre, tes émissions, livres audio (les tiens et ceux proposés pour toi), découvrir. Fonctionne avec Spotify en français comme en anglais (une section non reconnue va dans « Découvrir » plutôt que de disparaître).
- **Mes playlists en trois colonnes** : les tiennes, celles des autres, celles de Spotify.
- **Filtres par style** dans chaque sous-menu, avec un ▶ pour lancer tout un style en aléatoire. Les styles viennent de tes dossiers (voir [À adapter](#à-adapter-à-ta-bibliothèque)).
- **Nombre d'écoutes** sur chaque playlist et chaque album, et tri « Plus écoutées ».
- **Suggestions de rangement** (bouton « Ranger » de Mes playlists) : playlists dont les artistes relèvent surtout d'un autre dossier de style, playlists en vrac à la racine au style net, playlists pas écoutées depuis plus d'un an (quand Spotify connaît la date). Pour chacune : « Déplacer vers… » (ou « Archiver », dans un dossier `ARCHIVES`) et « Ignorer ». Rien ne bouge sans ton clic.
- **Mes albums par date de sortie** : tris « Sortie ↓ » et « Sortie ↑ ».
- **3 emplacements en haut : Titres likés + 2 playlists au choix** : des emplacements vides en pointillé montrent où elles vont. Clic droit sur une playlist, un album, un artiste, une émission ou un dossier → « Épingler sur l'accueil » (3 emplacements, Titres likés compris, toujours sur une ligne). Glisse une carte, Titres likés compris, pour changer l'ordre. Les titres likés sont toujours là, avec lecture ou aléatoire.

### Lecture plein écran
Le bouton plein écran de la barre du lecteur (ou ⤢ du panneau En cours de lecture) ouvre une vue plein écran : pochette en grand, contrôles, **paroles synchronisées** (clic sur une ligne pour s'y rendre) et liste **À suivre** (clic sur un titre pour y sauter). Échap pour fermer.

### Clic droit
- **Partout** : les cartes de l'accueil et la liste « À suivre » ouvrent le vrai menu de Spotify.
- **« Écouter plus tard »** : met de côté un titre, un album, une playlist ou un artiste sans le liker. On le retrouve dans l'onglet « Plus tard », où ce qui a été joué est marqué « Écouté ». L'horloge de la vue Lecture fait la même chose pour le titre en cours.
- **« Discographie complète »** (sur un artiste, un album ou un titre) : toutes les sorties de l'artiste, filtrables (albums, EP, singles, compilations, déjà dans ta bibliothèque) et triables par date.
- **« Épingler sur l'accueil »** / **« Retirer de l'accueil »**.

### Glisser-déposer
Fais glisser un titre (barre du lecteur, file d'attente…) sur « Titres likés » pour le liker, ou sur une de tes propres playlists (colonne « Mes playlists » ou carte épinglée) pour l'y ajouter, sans doublon.

### Automatismes
- **Saisons** : si tu ranges tes playlists de saison dans un dossier `SAISONS`, la playlist de la nouvelle saison (« automne '26 »…) est créée au début de chaque saison astronomique, épinglée, et la précédente rangée dans `SAISONS`.
- **Démarrage** : si Spicetify rate son initialisation (ça arrive au lancement de Spotify), l'interface se recharge toute seule.

### Interface
Panneau de gauche masqué (la navigation passe par l'accueil), bouton « Studio » retiré, bouton Maison en double retiré, bande colorée de l'en-tête retirée sur l'accueil.

## Installer

La page Accueil et la vue Lecture sont des *custom apps* : le Marketplace de Spicetify ne sait pas les installer, il faut passer par le script.

Télécharger le dépôt (bouton **Code → Download ZIP**) et le dézipper, ou :
```bash
git clone https://github.com/Simon-Gaspar/spicetify-compact.git
```

**Mac** : ouvrir le Terminal dans le dossier et lancer `./install.sh` (Homebrew requis).

**Windows**
1. Double-cliquer sur `install.cmd`, sans le lancer en administrateur. Si Windows affiche « Windows a protégé votre ordinateur », cliquer sur « Informations complémentaires » puis « Exécuter quand même ».
2. Si l'installeur de Spicetify demande d'installer le Marketplace, répondre **N**.

Le script installe Spicetify s'il manque, copie le thème, les deux pages et les extensions, puis redémarre Spotify.

**Depuis le Marketplace**, seuls le thème et les extensions s'installent : sans les custom apps, le panneau de gauche et l'accueil natif restent en place.

## Mettre à jour

- **Le thème** : récupérer la dernière version du dépôt (`git pull`, ou nouveau ZIP) et relancer le script d'installation.
- **Après une mise à jour de Spotify**, les modifications sautent : relancer le script, ou `spicetify backup apply` (dans le Terminal ou PowerShell).

Revenir au Spotify d'origine : `spicetify restore`.

**Avis de mise à jour** : une fois par jour, le thème lit `version.json` sur ce dépôt (rien d'autre n'est téléchargé ni exécuté). Quand une version plus récente est publiée, un bandeau le signale en haut de l'accueil ; « Plus tard » le masque pour cette version.

**Publier une nouvelle version** (mainteneur) : passer `ACCUEIL_VERSION` en tête de `spicetify/Extensions/accueil-core.js` et `version` dans `version.json` au même numéro, avec éventuellement une courte note dans `version.json` (`notes.fr` / `notes.en`), puis pousser.

## À adapter à ta bibliothèque

- **Styles** : sans dossiers, pas de filtres par style (une astuce le rappelle) — tout le reste fonctionne. Un style = un dossier de premier niveau de ta bibliothèque, détecté automatiquement (sauf `SAISONS`). Les albums, mix et découvertes sont classés d'après leurs artistes, et ce qui ne rentre dans aucun style va dans « Mixte ». Pour ne garder que certains dossiers ou changer leur nom affiché, édite `STYLE_LABELS` au début de `CustomApps/accueil/index.js` (dans `%APPDATA%\spicetify` sous Windows, `~/.config/spicetify` sur Mac), puis `spicetify apply` : dès qu'un dossier de cette liste existe, seuls ceux de la liste comptent. L'analyse est refaite chaque semaine.
- **Saisons automatiques** : ne s'activent que si tu as un dossier `SAISONS` à la racine de ta bibliothèque. Sans ce dossier, rien n'est créé.
- **Épingles** : au premier lancement, elles reprennent les éléments épinglés de ta bibliothèque Spotify, puis c'est toi qui choisis.

## Langue

Français si Spotify est en français, anglais sinon. Pour forcer une langue, ouvre la console (`spicetify enable-devtools`, puis clic droit → Inspecter) et lance `localStorage.setItem("accueil:lang", "fr")` (ou `"en"`), puis recharge avec Ctrl/Cmd+R. Les noms de styles viennent de tes dossiers et ne sont pas traduits.

## Gardé sur cet ordinateur

Ces données restent dans Spotify sur l'ordinateur où le thème est installé : elles ne passent pas sur ton téléphone ni sur un autre ordinateur.

| Donnée | Détail |
|---|---|
| Écoutes | Une écoute = une fois où tu lances la playlist ou l'album, sur n'importe quel appareil (Spotify synchronise la date de dernière écoute). Deux écoutes à moins de 30 min comptent pour une ; compté à partir de l'installation. |
| Plus tard | La liste « Écouter plus tard ». |
| Épingles | Les cartes du haut de l'accueil. |
| Styles, dates de sortie | Mis en cache pour aller vite (styles refaits chaque semaine). |

## En cas de souci

- **Écran « Something went wrong » ou accueil incomplet au lancement** : le thème recharge l'interface tout seul, jusqu'à 3 fois. Si ça persiste, quitte et relance Spotify.
- **Une fonction disparaît après une mise à jour de Spotify** : un bandeau le signale en haut de l'accueil, avec une notification une fois par version. Détails dans la console : `spicetify enable-devtools`, puis messages `[accueil]`.

## Limites

- Pas de filtre des morceaux générés par IA : Spotify n'expose pas cette information.
- Le thème s'appuie sur des API internes de Spotify, qui changent parfois avec ses mises à jour.
- Spicetify modifie l'app Spotify, ce que les conditions d'utilisation de Spotify n'autorisent pas (ce n'est quasiment jamais appliqué). À utiliser en connaissance de cause.
