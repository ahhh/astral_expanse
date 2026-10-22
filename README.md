# Astral Expanse: The Far Trade

A mobile-first browser game based on `ASTRAL_EXPANSE_Full_Game_Design.md`: a roguelike hex colony builder where you set out with a single clan, recruit up to two more along the way, build cascading colonies and weave them into a star-chart trade network. Plain HTML/CSS/JavaScript (ES modules) with no build step and no dependencies.

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

Progress saves automatically to the browser's `localStorage` after every action (key `astral-expanse.save.v1`), so you can close the tab and continue later. Saves from before the single-clan update are migrated automatically when you continue. Saves are per-browser and per-device; clearing site data removes them. In private windows or if storage is blocked, the game still runs, just without saving.

## How to play: a walkthrough

This section walks through a first expedition. The in-game **❓ How to play** screen has the same rules in short form, and the **📚 Codex** lists every building, Foundry blueprint, mega-project and local technology.

### 1. Set up the expedition

From the title screen choose **🚀 New expedition**.

1. **Pick a difficulty.** *Explorer* is the gentlest, with unlimited undo, a richer purse and a longer clock. *Standard* is the intended balance and allows one undo per turn. *Veteran* and *Nightmare* raise the checkpoints, shorten the clock, make route crises more frequent and remove undo.
2. **Add modifiers (optional).** *Volatile Space* gives every colony extra events. *Scarce Markets* means smaller shipments and worse prices. *Closing Veil* means −2 maximum Frontier Pressure. *Ironman* means no undo. *Lone Clan* caps your treaty at two clans.
3. **Pick a seed.** *Random*, today's *Daily* chart, or a *Custom* word or number. The same seed produces the same star chart, so friends can race the same expedition.
4. **Choose one founding clan.** You start small. Each clan's card shows its starter building, and the Codex shows its whole card pool.

### 2. Read the star chart

The **Chart** tab climbs from the Arkship Meridian at the bottom to the Mythic Crown at the top. Glowing worlds are the ones you can jump to next. You can only move forward, or sideways along a dashed lateral lane, which costs an extra point of Pressure. Tap a world to see its type, its resource profile (five pip bars), the mission length and difficulty, and the jump cost.

- 🏛️ **Clan Enclaves** are how your treaty grows. While you have a free slot, the resident clan joins you on that map, and if you secure the colony it **stays in your treaty**, up to three active clans. Once all three slots are full, the enclave clan replaces one of yours for that map only. Securing it then **licenses** the clan, and you can swap it in later at a Freeport.
- 🔺 **Gate Shrines** give Gate Shards. ⚓ **Freeports** are not colonies: they are trading posts and network hubs. 📶 Relay Rocks, 💰 Bonanzas, 🛸 Derelicts, 🔭 Observatories and 🌋 Fault Worlds each trade risk for different rewards.
- Worlds more than two layers ahead are **❔ Unsurveyed** until you get closer. A Survey Mast or a claimed Observatory extends that horizon.

Every jump costs Cryo Isotopes (CY) and adds Frontier Pressure. If Pressure hits its limit before you reach the Crown, the expedition ends. A good first jump is the Ark Reach enclave: it gives you a second clan straight away.

### 3. Build a colony

Each colony is a hex asteroid that you build up one card per turn.

1. **Tap a card** in your hand. Every legal hex shows a forecast of the Influence it would earn, and the best three glow gold. Tap a hex, check the expected chain reaction, then press **Build here**. **💡 Hint** suggests a move. **↶ Undo** rewinds a misplaced building (if your difficulty allows it).
2. **Chain reactions are the point.** Buildings fire On Build, on timers, while Sunlit, or in reaction to nearby events: a resource being created, consumed or melted, a hex heating up, a meteor landing, and so on. One well-placed card can set off a whole district. Each building activates at most twice per turn.
3. **Spend a turn on the land.** Instead of building, tap a Rock hex next to open ground and **⛏ Excavate** it into a Cavern, or tap one of your buildings and **💥 Demolish** it to free the hex. Either uses your turn, triggers nearby reactions (excavate or destroy listeners) and you still draw normally.
4. **Mind the light.** The asteroid turns a quarter each turn (see the sun compass). Solar buildings want Sunlit hexes and Cryo buildings want Shadow.
5. **Hit the checkpoints.** Every 5 turns, and on the final turn, you must earn an Influence target. Each checkpoint counts only Influence earned since the previous one, so a miss never leaves you behind on the next; your total still counts toward Masterwork and the expedition score. Missing one costs 3 Integrity, and missing the final one fails the colony. Each checkpoint you meet (except the last) offers a **🔬 local technology** for the rest of that map, for example Overclock, Shield Grid or Supply Drones.
6. **Go for mega-projects.** **🎯 Goals** tracks six arrangements, such as *Artificial Dawn* (Solar + Power network) and *Deep Biosphere* (connected Bio buildings on Pressurized ground). Completing one scores +12 and grants a lasting perk.
7. **Draws.** You draw 1 card per turn, +1 if two of your clans activated last turn (or your only clan did), and +1 more if all three did.

### 4. Claim a charter

When you secure a colony you choose its **charter**. It sets which world resource the colony ships home: Mint (Credits), Foundry Works (Alloys), Cryogenic Export Depot (Isotopes), Gene Ark (Gene Archives), Star Observatory (Star Data) or Free Trade Enclave. The one-off **claim shipment** grows with the world's abundance and with two stamps:

- **Specialize:** reach that charter's resource milestone, for example 3 Alloy or 5 Ice↔Water transformations.
- **Integrate:** connect a building from every active clan to the ★ Charter Beacon. Buildings in the Beacon's network also score +1 on their first scoring activation each turn.

### 5. Build the trade network

A claimed colony only exports once it is **supplied**, meaning a chain of lanes links it to the Arkship or a visited Freeport. Build lanes from a world's sheet or from the **Network** tab:

| Lane | Cost | Capacity |
|---|---|---|
| Short Relay | 2 AL + 1 CR | 3 units/jump |
| Midrange Convoy | 4 AL + 2 CR | 5 units/jump |
| Deep-Space Thread | 6 AL + 2 DA + 2 CY | 6 units/jump |

On every jump, supplied colonies ship their route yield until their production charges run out. Lane capacity can choke a busy trunk, so the Network tab's **shipment forecast** shows how much gets through. You can also set a **trade policy** that gives one resource priority. Connect **three colonies with different charters in a loop** and they form a **trade ring**: exports detour around trouble and you sign a **Trade Compact** (Industrial Cycle, Living Circuit or Cryo Logistics).

From Frontier Pressure 4 onwards, **route crises** are forecast one jump ahead: Micrometeor Swarms, Ion Blackouts, Customs Disputes, Quarantines and Gravity Shear. Pay to avert them, or fit lane upgrades (Armor, Cold Chain, Signal Beacons, Diplomatic Clearance) that deflect them automatically.

### 6. Spend world resources between colonies

- **Clans:** see your treaty slots. Raise a clan's *Presence* so more of your draws come from it, *Favor* or *Ban* individual cards (you get one free Favor and one free Ban at the start and after every planet; up to 8 bans, 3 per clan), research Mid/Advanced tiers earlier, and buy **Clan Enhancements**: two levels per clan, each a visible head start on every map, such as a Bio-Loam patch or an extra starter card.
- **Foundry:** 18 shop-only blueprints, two per clan. Buying one adds it to that clan's draw pool. Offers refresh in each new sector, or for 2 CR at a Freeport.
- **Fleet:** up to two one-shot **Preparations** for the next colony (deep scans, ice pods, insurance, an emergency shuttle and more). The **Fleet Yard** sells permanent upgrades: Survey Mast, Cargo Keel, Cold-Chain Engine, Mobile Embassy, a third Preparation slot and a Rescue Tug.
- **Goals:** carry one **sector contract** at a time, such as *Cryogenic Corridor* or *Veil Cartography*, for bonus rewards. The tab also tracks your Veil checklist and the log.
- **Freeports / Arkship services:** exchange resources at imperfect rates, amend your treaty (swap a licensed clan in or fill an empty slot), and complete licenses for clans you contacted but failed to secure.

A failed colony becomes a **Stranded Site**. You can rescue it later from the Network tab, which turns it into a small Salvage Outpost.

### 7. Cross the Veil

To reach the Mythic Crown, aim for **3 Gate Shards**, **8 supplied throughput in one jump** and **3 CY** for the final jump. Missing a requirement doesn't lock the finale, it raises the boss map's checkpoints. At the **Veil Relay** you can spend up to three **Supply Tokens** (one per 3 units of peak throughput) on sealed cargo bundles, such as Reinforced Landing, Thermal Reserve or Predictive Array. You can also make one free clan swap. Then choose one of three superplanets:

- **Aurelia Prime:** mining gold builds Fault Stress until the Mantle Roar.
- **Nyxea:** melting ice raises the Fracture Tide.
- **Viridion Sovereign:** Wild Growth spreads unless you tame it.

Each boss shows its stabilization objective before you commit. Win, and your ending (*Survival Claim*, *Resonant Capital* or *Transcendent Civilization*) depends on Masterwork Influence, three-clan cooperation and your supply line. You can then push on into the **♾️ Endless Frontier**, which adds four more layers and three new superplanets each round.

### Tips for a first run

- Take the first enclave. Two clans earn more draws and open cross-clan cascades.
- Keep free hexes around multi-unit deposits: converters put their product next to the deposit.
- Build your first lane early. A single Short Relay back to the Arkship pays for itself within a few jumps.
- Watch Frontier Pressure. Lateral detours and failed colonies both cost extra.

## What is implemented

**Colony map:** procedural hex asteroids with Surface, Rock/Caverns and Orbital slots; a four-phase light cycle; multi-unit deposits; statuses; forecast local events; Integrity; Influence checkpoints; reactive cascades with a two-activation cap; placement forecasts, hints, undo and an activation log. **Local technologies** are offered at every met checkpoint, and six **mega-projects** are recognized automatically.

**All 9 clans and all 135 base buildings** (7 Common / 5 Uncommon / 3 Rare per clan), plus the **Card Foundry's 18 shop-only blueprints**, all scored on the same rubric.

**Expedition:** a single founding clan that grows to at most three active clans through Clan Enclaves (guest join, license, contact, Freeport swaps, Mobile Embassy, Veil swap); a branching star chart with a survey horizon; the full node roster; Frontier Pressure; charters and stamps; a **lane graph with capacity** (max-flow routing, trade policies); **route crises** with forecasts, fixes and lane upgrades; **trade rings and Trade Compacts**; **sector contracts**; the Clan Directorate with **Clan Enhancements**; Preparations and **Fleet Yard upgrades**; Stranded Site rescue; the Veil checklist with **finale Supply Tokens**; three superplanet bosses; and the **Endless Frontier**. **Difficulty presets**, **run modifiers** and **seeded/daily charts** are chosen at setup.

**Simplified or left out:** Clan Enhancements are one two-level track per clan rather than three branches; the Wormhole Stitch lane and the Surface Regrading preparation are not in.

## Balance

The building balance and its rubric are documented in **[docs/BALANCE.md](docs/BALANCE.md)**. In short, every card is priced in Power Points, rarity bands set how strong each rarity must be, and a headless simulator plays every three-clan trio to check the rubric against real play.

```sh
node tools/rubric-check.mjs                          # rubric PP for every card + band check
node tools/sim.mjs 12 --json docs/sim-results.json   # ~1000 simulated colonies (≈2 min, uses all cores)
node tools/calibrate.mjs docs/sim-results.json       # update the rubric's reliability inputs from the data
node tools/balance-report.mjs docs/sim-results.json  # regenerate docs/BALANCE.md and js/engine/measured.js
node tools/expedition-smoke.mjs 3 [difficulty]       # bot plays whole expeditions end to end (lanes, contracts, Foundry, Veil, Endless)
```

The tools need Node 18+ (they share the game's engine modules; `package.json` only marks the folder as ES modules).

## Project layout

```
index.html, css/style.css      app shell and styles
js/main.js                     screen routing and saving
js/ui/                         colony map, star chart, codex, sheets
js/engine/cards.js             the 135 buildings + 18 Foundry blueprints (data + effects + rubric inputs)
js/engine/colony.js            colony rules engine, local technologies, mega-projects (pure, JSON state)
js/engine/mapgen.js            procedural maps, checkpoints, preparations, enhancements, supply tokens
js/engine/expedition.js        star chart, difficulty, lanes & crises, rings, contracts, Foundry, fleet, Veil, Endless
js/engine/rubric.js            Power Point rubric
js/engine/ai.js                greedy bot (simulator and Hint button)
tools/                         simulator, calibration and report scripts
docs/BALANCE.md                rubric, method, results and full card tables
art/cards/<card id>.webp       card illustrations
art/tiles/b/<card id>.webp     building hex tiles (clipped to a hex under the initials)
art/tiles/r/<resource>.webp    resource hex tiles
art/planets/<id>.webp          star-chart icons: node types, superplanets, `unknown`
art/maps/<type>.webp           optional colony backdrops, one per planet type (see below)
```

Art comes from `image_gen_pipeline` (`generate_astral_art.py` for cards, `generate_astral_tiles.py` for tiles and planet icons). `js/ui/art.js` holds the paths; any missing image falls back to the old emoji or initials.

### Colony backdrops

Drop a `art/maps/<id>.webp` in and the colony map shows it behind the asteroid, muted (desaturated, dimmed, slightly blurred) and cropped to cover. `<id>` is the planet type the colony is on: `prospect`, `bonanza`, `enclave`, `relay`, `derelict`, `observatory`, `fault`, `shrine`, or the superplanet `aurelia`, `nyxea`, `viridion`. Quick colonies from the title screen use `prospect`. A portrait image around 1024×1536 suits a phone; keep its middle dark and quiet, because the hex grid sits on top.
