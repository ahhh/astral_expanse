# Astral Expanse: The Far Trade

A mobile-first browser game based on `ASTRAL_EXPANSE_Full_Game_Design.md`: a roguelike hex colony builder with clans, cascading buildings and a star-chart trade network. Plain HTML/CSS/JavaScript (ES modules) with no build step and no dependencies.

## Play locally

ES modules need an HTTP server (opening `index.html` as a file will not work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

To try it on a phone, run the server on your computer and open `http://<your-computer-ip>:8000` on the phone (same Wi-Fi).

## Host on GitHub Pages

1. Create a GitHub repository and push this folder to it (the `index.html` must sit at the repository root).
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose `main` and `/ (root)`, and save.
3. After a minute the game is live at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so Pages serves the files as-is. All paths are relative, so the game works from any sub-path.

## Saving

Progress saves automatically to the browser's `localStorage` after every action (key `astral-expanse.save.v1`), so you can close the tab and continue later. Saves are per-browser and per-device; clearing site data removes them. In private windows or if storage is blocked, the game still runs, just without saving.

## What is implemented

**Colony map** – procedural hex asteroids with Surface, Rock/Caverns and Orbital slots; a four-phase light cycle; multi-unit deposits; statuses (Hot, Cold, Pressure, Radiation, Stable/Unstable, Shielded, Shade); forecast local events (meteors, flares, cryo-nights, derelicts, tremors, comets, radiation surges); Integrity; Influence checkpoints; reactive event cascades with a two-activation cap; per-hex placement forecasts, a hint button and an activation log.

**All 9 clans and all 135 base buildings**, each with a rarity (7 Common / 5 Uncommon / 3 Rare per clan), a tier (Early / Mid / Advanced) and a rubric score.

**Expedition** – a branching 10-layer star chart (Ark Reach → Shatter Belt → Vesper Drift → Veilward → Mythic Crown) with Prospect, Bonanza, Clan Enclave (guest clan + license), Relay Rock, Derelict, Observatory, Fault World, Gate Shrine and Freeport nodes; Frontier Pressure; Cryo Isotope travel costs; colony charters with Establish/Specialize/Integrate stamps and claim shipments; trade lanes with per-jump route yields and production charges; the Clan Directorate (Presence, Favor, Ban, Research); Preparations; Freeport exchange and clan swaps; three superplanet bosses (Aurelia Prime, Nyxea, Viridion Sovereign) with their own hazard systems and stabilization objectives.

**Not yet implemented** from the design doc: the Card Foundry's 18 shop-only blueprints, lane capacity and route disruptions, trade compacts and rings, sector contracts, fleet upgrades, mega-projects, local technologies, finale Supply Tokens and Endless Frontier.

## Balance

The building balance and its rubric are documented in **[docs/BALANCE.md](docs/BALANCE.md)**. In short, every card is priced in Power Points, rarity bands set how strong each rarity must be, and a headless simulator plays every three-clan trio to check the rubric against real play.

```sh
node tools/rubric-check.mjs                          # rubric PP for every card + band check
node tools/sim.mjs 12 --json docs/sim-results.json   # ~1000 simulated colonies (≈2 min, uses all cores)
node tools/calibrate.mjs docs/sim-results.json       # update the rubric's reliability inputs from the data
node tools/balance-report.mjs docs/sim-results.json  # regenerate docs/BALANCE.md and js/engine/measured.js
node tools/expedition-smoke.mjs 3                    # bot plays whole expeditions end to end
```

The tools need Node 18+ (they share the game's engine modules; `package.json` only marks the folder as ES modules).

## Project layout

```
index.html, css/style.css      app shell and styles
js/main.js                     screen routing and saving
js/ui/                         colony map, star chart, codex, sheets
js/engine/cards.js             the 135 buildings (data + effects + rubric inputs)
js/engine/colony.js            colony rules engine (pure, JSON state)
js/engine/mapgen.js            procedural maps, checkpoints, preparations
js/engine/expedition.js        star chart, economy, Directorate, bosses
js/engine/rubric.js            Power Point rubric
js/engine/ai.js                greedy bot (simulator and Hint button)
tools/                         simulator, calibration and report scripts
docs/BALANCE.md                rubric, method, results and full card tables
```
