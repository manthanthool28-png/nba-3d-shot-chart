# NBA 3D Shot Chart

Every shot of a player's season on an interactive 3D court — green went in,
red missed, taller spikes mark the areas where the player scores most
efficiently.

Built with [Three.js](https://threejs.org/), [D3](https://d3js.org/) and
[Vite](https://vitejs.dev/), using real shot-location data from the NBA stats
API (via [nba_api](https://github.com/swar/nba_api)).

## Features

- **3D shot field** — 11 players' 2024-25 seasons (~13k shots), with zone
  efficiency spikes, hot-streak glow, shot-arc replay on click, and a
  timeline scrubber.
- **2D stat charts** — classic shot chart, eFG% by zone vs league average,
  attempt share, FG% by quarter/distance, shot-type mix.
- **Compare mode** — overlay, split-court, or zone-diff any two players.
- **Movable UI** — draggable filter dock (with auto-hide) and camera panel.
- **Accessibility** — colorblind-safe palette, high-contrast mode, reduced
  motion, keyboard navigation, and a screen-reader-friendly table view.

## Run locally

```sh
npm install
npm run dev
```

## Fetch more players

```sh
python -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/fetch_shots.py --player "Player Name" --season 2024-25
```

## Optional 3D models

Drop `.glb` files into `public/models/` (arena, hoop, ball, or player
figures) and the app picks them up automatically — see
`public/models/README.txt` for naming and licensing notes.
