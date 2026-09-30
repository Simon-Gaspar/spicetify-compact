# Compact — Spicetify theme

**English** · [Français](README.fr.md)

![Preview](preview.png)

A Spotify built around **your** library: a custom home page instead of recommendations, a fullscreen now-playing view with lyrics, and an interface stripped of what you don't use.

For the **Spotify desktop app downloaded from spotify.com** (not the Microsoft Store or Mac App Store version), on Mac or Windows. Built for Spotify 1.3 and Spicetify 2.45.

> The theme's interface is in French. It works with Spotify set to French or English. Button labels are quoted below in French, followed by their meaning.

## What it changes

### Home
- **Music / Podcasts & books tabs** (« Musique » / « Podcasts & livres »), each with its own sub-menu: my playlists, my albums, listen later, mixes for me, new releases, discover. On the podcast side: new episodes, resume, your shows, audiobooks (yours and suggested ones), discover. Any section the theme doesn't recognize lands in « Découvrir » (Discover) instead of disappearing.
- **My playlists in three columns**: yours, other people's, Spotify's.
- **Style filters** in every sub-menu, with a ▶ to shuffle a whole style. Styles come from your folders (see [Adapting it to your library](#adapting-it-to-your-library)).
- **Play counts** on every playlist and album, and a "most played" sort (« Plus écoutées »).
- **Tidy-up suggestions** (« Ranger » button in My playlists):
  - playlists whose artists mostly belong to another style folder;
  - loose playlists at the library root with a clear style;
  - playlists not played in over a year, when Spotify knows the date.

  Each one gets a move (« Déplacer vers… ») or archive (« Archiver », into an `ARCHIVES` folder) button, plus « Ignorer » (dismiss). Nothing moves until you click.
- **Albums by release date**: « Sortie ↓ » and « Sortie ↑ » sorts.
- **Pin your 3 go-to playlists at the top**: empty dashed slots show where they go. Right-click a playlist, album, artist, show or folder → « Épingler sur l'accueil » (pin to home); more than 3 works too. Drag any card, Liked Songs included, to reorder them. Liked Songs is always there, with play or shuffle.

### Fullscreen playback
The fullscreen button in the player bar (or ⤢ in the Now Playing panel) opens a fullscreen view:
- large cover art and playback controls;
- **synced lyrics**: click a line to jump to it;
- **up next** list: click a track to skip to it.

Press Esc to close.

### Right-click
- **Everywhere**: home cards and the up-next list open Spotify's real context menu.
- **« Écouter plus tard »** (listen later): sets a track, album, playlist or artist aside without liking it. You'll find it in the « Plus tard » tab, where anything you've played is marked « Écouté ». The clock in the playback view does the same for the current track.
- **« Discographie complète »** (on an artist, album or track): every release by the artist. Filter by albums, EPs, singles, compilations or already in your library, and sort by date.
- **« Épingler sur l'accueil »** / **« Retirer de l'accueil »** (pin to / unpin from home).

### Drag and drop
Drag a track (player bar, queue…) onto Liked Songs to like it, or onto one of your own playlists to add it without duplicates. Your own playlists are the ones in the « Mes playlists » column and your pinned cards.

### Automations
- **Seasons**: if your seasonal playlists live in a `SAISONS` folder, the playlist for the new season (« automne '26 »…) is created at the start of each astronomical season and pinned. The previous one is filed into `SAISONS`.
- **Startup**: Spicetify sometimes fails to initialize when Spotify launches. When it does, the interface reloads itself.

### Interface
- Left sidebar hidden: you navigate from the home page.
- « Studio » button removed.
- Duplicate Home button removed.
- Colored sticky header band removed on the home page.

## Install

The home page and the playback view are *custom apps*. Spicetify's Marketplace can't install those, so use the script.

Download the repo (**Code → Download ZIP**) and unzip it, or:
```bash
git clone https://github.com/Simon-Gaspar/spicetify-compact.git
```

**Mac**: open Terminal in the folder and run `./install.sh` (Homebrew required).

**Windows**
1. Double-click `install.cmd`. Don't run it as administrator. If Windows shows "Windows protected your PC", click "More info", then "Run anyway".
2. If the Spicetify installer offers to install the Marketplace, answer **N**.

The script installs Spicetify if needed, copies the theme, both pages and the extensions, then restarts Spotify.

**From the Marketplace**, only the theme and the extensions get installed. Without the custom apps, the left sidebar and Spotify's own home page stay as they are.

## Update

- **The theme**: get the latest version of the repo (`git pull`, or a new ZIP) and run the install script again.
- **After a Spotify update**, the changes are gone: run the script again, or `spicetify backup apply` (in Terminal or PowerShell).

Back to stock Spotify: `spicetify restore`.

## Adapting it to your library

- **Styles**: one style = one top-level folder in your library, detected automatically (except `SAISONS`).
  - Without folders there are no style filters; a hint in the interface points this out. Everything else works.
  - Albums, mixes and discoveries are classified from their artists. Anything that fits no style goes into « Mixte » (mixed).
  - To keep only some folders or rename how they're displayed, edit `STYLE_LABELS` at the top of `CustomApps/accueil/index.js`, then run `spicetify apply`. The folder is `%APPDATA%\spicetify` on Windows and `~/.config/spicetify` on Mac. As soon as one folder from that list exists, only the listed folders count.
  - The analysis runs again every week.
- **Automatic seasons**: only active if you have a `SAISONS` folder at the root of your library. Without it, nothing is created.
- **Pins**: on first launch, they start from the items pinned in your Spotify library. After that, you choose.

## Kept on this computer

This data stays in Spotify on the computer where the theme is installed. It doesn't carry over to your phone or another computer.

| Data | Details |
|---|---|
| Play counts | One play = one time you start the playlist or album, on any device (Spotify syncs the last-played date). Two plays less than 30 min apart count as one. Counting starts at install. |
| Listen later | The « Écouter plus tard » list. |
| Pins | The cards at the top of the home page. |
| Styles, release dates | Cached for speed (styles are recomputed every week). |

## Troubleshooting

- **"Something went wrong" screen or incomplete home page at launch**: the theme reloads the interface by itself, up to 3 times. If it persists, quit and restart Spotify.
- **A feature disappears after a Spotify update**: a banner at the top of the home page flags it, with a notification once per version. For details, run `spicetify enable-devtools` and look for `[accueil]` messages in the console.

## Limitations

- No filter for AI-generated tracks: Spotify doesn't expose that information.
- The theme relies on Spotify's internal APIs, which sometimes change with its updates.
- Spicetify modifies the Spotify app. Spotify's terms of use don't allow that, although it's almost never enforced. Use at your own discretion.
