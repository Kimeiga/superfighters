# Haki's Prototype Arcade

Ten playable, original Canvas game prototypes for desktop and touch browsers.
These are compact 2D mechanical experiments, not production Unity games or
feature-complete implementations of the concept pitches.

## Play

Open `arcade-offline.html` in a desktop browser for all ten games with local AI.
For multiplayer, run the included server or use the deployed arcade URL.

```sh
npm install
npm test
npm start
# Open http://localhost:3000
```

Node 22 or newer is required. The only runtime dependency is `ws`.
Create a friend room, copy the invite, have friends join, then start the round.
The seven multiplayer games support up to four humans; empty seats use optional
rule-based bots. Misprint, Upstairs Is on Fire and Yesterday's Crew are solo
experiments with optional AI autopilot. AI never calls a paid model service.

## Controls

Click or drag on the scene to move your target. WASD or arrow keys also move.
Space, E and Q activate the three labeled actions. Number keys select tools.
Touch controls are displayed beneath the scene. Grid games place objects by
selecting a tool and tapping a cell. Per-game instructions and hints are visible.

## Games

| ID | Game | Prototype loop |
|---|---|---|
| grab-shift | Grab Shift | Grab cargo, coordinate heavy lifts, avoid bombs, extract valuables |
| misprint | Misprint | Place stamps, calculate combinations, complete three orders |
| haunt-for-hire | Haunt for Hire | Possess props and combine scares against reactive residents |
| upstairs-is-on-fire | Upstairs Is on Fire | Place rooms with beneficial or harmful adjacency |
| we-are-the-floor | We Are the Floor | Move platforms under a robot carrying a cake |
| do-not-open | Do Not Open | Pack cursed parcels while respecting interaction rules |
| yesterdays-crew | Yesterday's Crew | Record echo routes, hold pressure pads, steal a jewel |
| sink-different | Sink Different | Plug leaks, pump water and use jets to reach harbor |
| scrap-sumo | Scrap Sumo | Build a small robot and battle humans or bots |
| pet-sitting-is-easy | Pet Sitting Is Easy | Manage reactive creature needs with different care tools |

## Architecture and limitations

`games/` contains deterministic game state updates, policies and Canvas renderers.
`lib/` contains the shared simulation and rendering utilities. `web/` contains
input handling, the room client and a local-only playtest notebook.

The native `server.mjs` runs authoritative simulations at 20 Hz and sends
snapshots at 10 Hz. Room IDs are cryptographically random; each participant has a
separate private reconnect token. Guests cannot change host controls. A departing
human is replaced by a bot, and hosting controls transfer to another connected
human. Empty rooms expire after ten minutes. There is no database or saved
multiplayer progression. All rooms disappear when the server restarts.

The AppDeploy fallback, if enabled, runs simulation in the host browser and uses
platform HTTP/WebSocket APIs for room traffic. That route requires the host to
keep the tab open and active. Its prototype snapshot rate is lower than the
native server. It is not a dedicated server or a robust competitive-game service.

Physics is deliberately simplified. There is no voice chat, account system,
payment flow, matchmaking queue, custom artwork pipeline, Unity project, native
mobile app, migration of active sessions across deploys, or commercial anti-cheat.
AI is a set of inspectable heuristics, not a learned model or a claim of optimal
play. Solo autopilot is optional, and it can lose.

## Deployment

`Dockerfile` and `railway.toml` configure a single shared service. The HTTP health
endpoint is `/health`; `PORT` is respected. Deploy this directory as the service
root and generate an HTTPS domain. One service hosts all ten unique game routes:
`/play/grab-shift`, etc., or `/#game=grab-shift`.

Railway project creation was attempted on September 11, 2026 and rejected because
the account's trial had expired. No plan was purchased. A connected OAuth app does
not remove that billing requirement.

The available GitHub connector can write existing repositories but cannot create
new ones. Source is therefore published on an isolated prototype branch, not ten
new hosted repositories. The export script creates ten independent local Git
repositories with their own README, source and offline build.

## Tests

```sh
npm run check
npm test
python3 scripts/bundle.py
# Optional browser tests require Python Playwright and Chromium:
python3 tests/render_test.py
# With npm start running:
python3 tests/network_test.py
```

The browser smoke suite covers all ten local games, pause/resume and touch layout.
The networking suite connects independent WebSocket clients and tests shared
movement, four-seat limits, guest permissions, reconnection and host transfer.
Tests are not evidence of enjoyable play or actual iPhone hardware performance.

## Ownership

Original prototype code created for Hakan Alpay. All rights reserved unless Hakan
chooses another license. No third-party game assets are included. `ws` and optional
hosting SDKs retain their own licenses.
