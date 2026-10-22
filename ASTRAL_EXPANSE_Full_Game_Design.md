# ASTRAL EXPANSE: THE FAR TRADE
## Game Design Document — Colony, Clan, Card, and Overworld Systems

**Status:** Comprehensive concept design / initial balancing pass  
**Version:** 2.0  
**Genre:** Roguelike spatial city-builder + strategic star-map expedition + deck-pool customization  
**Player fantasy:** Make extraordinary self-activating colonies on strange asteroids; weave them into a functioning interstellar economy; and reach a mythical superplanet before the frontier collapses.  
**Design reference:** Inspired by the satisfaction of placement-based, tag-driven cascade city builders such as *Combolands*. This document describes a distinct original game; all numbers and names are proposed design values, not tested balance.

---

# 1. Game at a Glance

One **expedition** spans a branching, procedurally generated **star map**. At the beginning, the player signs treaties with **three of nine clans**. Those clans provide the cards available during colony-building. The player chooses an asteroid or planet to colonize, enters a smaller procedural hex map, and plays **one building per turn**, with **one to three new cards offered** based on colony synergy. Each building has tags, spatial effects, and activation triggers; placement creates chains of resource transformations and scoring events.

When a colony is secured, it joins the overworld as a **trade node**. Unlike normal colony resources (Ice, Ore, Water, Biomass, Scrap), it generates **world-only commodities** that the player spends between colony maps on routes, ship upgrades, clan investment, card acquisitions, card bans, and pre-deployment advantages. Routes link settlements into a growing economic web; connected colonies can exchange supplies and alter the rules of future colony maps.

Some worlds are **Clan Enclaves**. Landing on one unlocks the associated clan for the current expedition and temporarily **replaces one of the three active clans on that colony**. After securing the colony, the clan becomes eligible for future lineup swaps at appropriate overworld nodes. The player's starting trio therefore gives the expedition an identity without locking it permanently.

The expedition's destination is a cluster of **mythical superplanets** beyond the Veil. Each is a rare-resource paradise and a large, dangerous **environmental boss map**. The final test is not defeating an enemy unit: it is engineering a self-sustaining mega-colony while the planet's extreme geology, weather, biology, or physics fights back.

### Design promise

> Every colony is a machine you build by hand. Every route makes that machine matter elsewhere. Every clan choice changes how the next world can be solved.

### Core pillars

1. **Placement is the main decision.** Resource-bearing tiles, building tags, network geometry, orbital links, and turn-trigger sequences matter more than resource bookkeeping.
2. **Asteroids are not generic islands.** Rotation, sunlight, shadow, interior excavation, low gravity, meteors, radiation, and orbits create the puzzle.
3. **The overworld changes the local rules.** Exports, routes, faction allegiance, card biases, and convoy purchases materially alter how the next colony begins.
4. **All nine clans speak a shared tag language.** Synergy emerges from physical interactions, not a fixed list of scripted three-clan bonuses.
5. **Travel has an opportunity cost.** The player cannot idle to farm exports infinitely; each expedition jump advances trade, hazards, and a rising frontier threat.
6. **The endgame makes abundance dangerous.** A superplanet has extraordinary resource density, but controlling that abundance is the boss challenge.

---

# 2. The Two Interlocking Gameplay Loops

## 2.1 Expedition loop (overworld)

1. **Choose three starting clans** and a starting expedition modifier.
2. **Survey the star chart:** reveal candidate colonies, their resource bias, hazards, clan affinity, possible exports, and branching connections.
3. **Choose a route and a world**; optionally buy intel, cargo drops, or colony-specific modifiers before departure.
4. **Play the colony map**, earning Influence and satisfying a charter objective.
5. **Claim the colony:** get a one-time resource shipment, activate its trade specialization, unlock discoveries/clans, and install one local charter.
6. **Connect it to the trade network** and choose which links to improve or protect.
7. **Spend world-only resources** in the Expedition Exchange, Clan Directorate, Card Foundry, and Fleet Yard.
8. **Travel again.** Active trade routes deliver goods; frontier pressure escalates; deeper systems become reachable.
9. **Collect Gate Shards**, open the Veil, and complete a superplanet boss colony.

## 2.2 Colony loop (local map)

1. Draw **one base building card** plus up to two synergy bonus cards.
2. Play **one building** from hand in a legal Surface, Cavern, or Orbital position.
3. Resolve placement, resource creation/consumption/transformation, adjacency, and network triggers.
4. Advance the local environment: the asteroid's rotation, day/night phase, timers, pressure, heat/cold, and forecast hazards.
5. Resolve new events and combo cascades, then award **Influence**.
6. Every few turns, meet the colony's **Influence checkpoint** and progress its **Charter Milestones**.
7. After the final checkpoint, choose a colony specialization and return to the overworld.

**Suggested length:** Ordinary colonies: 16–22 turns / about 15–25 minutes. Larger late-expedition colonies: 22–28 turns / about 20–35 minutes. Final superplanet: 30–36 turns / about 40–60 minutes. Expeditions are longer roguelike campaigns (roughly 8–12 ordinary colonies plus one final map) and should support save/resume between colonies.

**Run failure:** A local colony can fail if an Influence checkpoint is missed with no recovery available, or Asteroid Integrity reaches zero. Colony failure is costly but ordinarily **does not immediately end the entire expedition**: the node becomes a Stranded Site, some cargo is lost, and rescuing or routing around it consumes time. At higher difficulties, running out of fleet fuel with no reachable resupply, or reaching maximum Frontier Pressure before opening the Veil, ends the expedition. Boss-map failure ends the expedition, unless a rare contingency artifact permits a retreat.

---

# 3. The Procedural Star Chart

## 3.1 Galaxy architecture

The overworld is a zoomable **node-and-route star chart**, not a flat menu. Stars and planetoids occupy meaningful positions. Routes have direction, length, risk, and throughput; each visible node shows enough information to make a strategic choice.

| Region | Typical colony choices visible | Expected colonies claimed | New mechanic |
|---|---:|---:|---|
| **Ark Reach** — starting zone | 5–7 | 2–3 | Basic colony exports and one-step lanes |
| **Shatter Belt** — industrial frontier | 6–9 | 2–3 | Branching corridors, salvage, clan enclaves |
| **Vesper Drift** — contested deep space | 6–9 | 2–3 | Longer lanes, route hazards, specialized tariffs |
| **Veilward Expanse** — final approach | 5–7 | 2–3 | Gate Shards, extreme hazards, high-end cards |
| **The Mythic Crown** — finale | 3 named superplanets | 1 boss world | Mega-map and planetary catastrophe cycles |

**Starting node:** The **Arkship Meridian**, an indestructible mobile logistics hub that anchors the first colony and hosts basic overworld purchases. It is not itself a playable colony map.

A chart normally offers many more colony sites than the player has time, supplies, or transport capacity to visit. Branches may reconverge, so choosing a rich but remote gold asteroid can mean passing up a safer ice hub that would have supported several future routes.

**Procedural seed hierarchy:**

- **Expedition Seed** determines the star-chart topology, sector modifiers, node identities, enclave locations, merchant offerings, and final-world set.
- **World Seed** determines each site's hex topology, deposits, cavern positions, lighting/rotation, event schedule, and hidden features.
- **Charter Variant** gives the same world a different economic role and objectives when revisited in another expedition.

A node's **preview panel** shows the world seed, known resource ratings, risk band, unique traits, likely export goods, lane distance, and survey confidence. Its actual local hex map remains procedurally generated. Seed identity supports player discussion and replayability; there is no need to enter numerical seeds manually.

## 3.2 Node types

| Node | Main reason to visit | Typical choice |
|---|---|---|
| **Prospect Colony** | Standard building map with ordinary abundance and hazards | Reliable resources, route position, or favorable terrain |
| **Bonanza Colony** | Extreme abundance of a particular deposit, with a matching complication | High-value gold, ice, or fertile loam |
| **Clan Enclave** | Contact and unlock a fourth or later clan | Temporary clan substitution on this map; permanent expedition license afterward |
| **Relay Rock** | Small, short colony focused on trade connectivity | Strong route throughput and shortcuts, weaker raw exports |
| **Derelict Station** | Salvage-focused colony with shop discounts or rare blueprint access | Wreckage, Scrap, experimental cards |
| **Research Observatory** | Scientific colony with powerful survey intelligence | Star Data, asteroid forecasting, card tech |
| **Fault World** | Difficult map with unusual hazards and better payouts | High-risk compounding engines |
| **Gate Shrine** | Unique objective producing a Gate Shard | Required progress toward the Mythic Crown |
| **Freeport** | Non-colony visit that permits exchanges and roster adjustment | Buy, sell, reroute, repair; still consumes a jump |
| **Mythic Superplanet** | Final environmental boss map | Claim a super-resource world and finish the expedition |

## 3.3 Resource-value profiles and colony seeds

Every colony has a **resource profile**, a 0–5 abundance rating for five geophysical families: **Gold**, **Metal**, **Ice/Volatiles**, **Organic Loam**, and **Crystals/Exotics**. A rating influences deposit quantity, clusters, buried-resource odds, map features, and eventual charter export potential; it does *not* award overworld commodities merely for landing.

An abundance rating has a geographic expression:

- **Gold-rich** maps have exposed auric seams, precious meteorites, refinery opportunities, and potentially more active fault zones. `Gold Vein` has tags `Ore`, `Metal`, `Mineral`, `Precious`.
- **Ice-rich** maps have cryo ridges, gas pockets, permanent-shadow basins, and freeze–melt cycling.
- **Organic-rich** maps have carbonaceous **Bio-Loam** (`Organic`, `Bio`, `Soil`) and dormant spores. Bio-Loam supports Verdant growth and habitat milestones; it is not ordinary Earth dirt.
- **Metal-rich** maps have dense iron-nickel bodies, mining fault lines, and industrial caverns.
- **Crystal/exotic-rich** maps have photonic seams, signal amplifiers, ancient devices, and dangerous radiation anomalies.

### Example generated destinations (illustrative)

| World / seed | Gold | Metal | Ice | Bio-Loam | Exotic | Hazard | Initial world export specialty |
|---|---:|---:|---:|---:|---:|---|---|
| **Aurum's Wake / 48172** | 5 | 4 | 0 | 1 | 1 | Fragile gold-bearing crust | Credits, Fleet Alloys |
| **Nacre-9 / 11408** | 0 | 1 | 5 | 2 | 2 | Long nights and ice fractures | Cryo Isotopes |
| **Morrow Husk / 85321** | 1 | 2 | 2 | 5 | 1 | Runaway spore bloom | Gene Archives |
| **Glass Meridian / 60219** | 2 | 1 | 0 | 1 | 5 | Radiation and light refraction | Star Data |
| **Cinderglass / 90477** | 3 | 4 | 2 | 0 | 4 | Solar storms and seismic activity | Alloys, Star Data |

A world with `Gold 5` is not simply "better" than one with `Gold 1`: its map may be harder, its export is less useful to the intended route, or reaching it may consume scarce Cryo Isotopes. The player chooses between **local combo potential**, **world resource production**, and **network location**.

### Minimum-viability protections

- At least one of a selected clan's important starting tags must appear on the map, through natural deposits, starting supplies, or a neutral support object.
- Each sector has multiple feasible forward paths and at least one accessible replenishment option.
- Critical Gate Shards always have at least two obtainable sources during normal expedition generation.
- Clan-Enclave substitution never forces a genuinely unusable card pool: one appropriate starter building and resource patch are supplied.
- Players see the main hazards, abundance biases, and travel costs before commitment; hidden information creates opportunity, not unavoidable softlocks.

---

# 4. The World-Only Economy

## 4.1 Separate resource layers

**Local resources** are physical deposits and objects on a colony hex map: Ore, Gold Vein, Ice, Water, Biomass, Scrap, Metal, Alloy, Fuel, Cargo, Gas, Crystal, Bio-Loam, and so forth. They support spatial combos and local Influence. These objects **do not persist as stackable inventory across planets**.

**World resources** are abstract, sealed trade commodities tracked *only on the star chart*. They are produced by completed colony charters and functioning trade routes. They buy expedition-level decisions and can affect the starting state or rules of later colonies.

This separation keeps local play a spatial puzzle rather than a warehouse simulator, while ensuring that what the player built locally has a visible strategic consequence.

## 4.2 Six overworld resources

| World resource | Fiction / typical source | Major uses |
|---|---|---|
| **Coalition Credits (CR)** | Gold extraction, population commerce, trade tariffs | Card bans, favored-card weights, shops, contracts, rerolls, repairs |
| **Fleet Alloys (AL)** | Industrial charters on metal/gold worlds | Construct and upgrade routes, outposts, fleet modules, structural starter kits |
| **Cryo Isotopes (CY)** | Export-grade ice and volatile fuel from cold worlds | Long-range travel, special convoy routes, freeze/cooling supply drops, emergency rescue |
| **Gene Archives (GE)** | Sequenced xenobiology and cultivated Bio-Loam | Terraforming starter kits, biological buffs, habitat bonuses, some clan tech |
| **Star Data (DA)** | Crystals, exploration arrays, observatories and exotic studies | Reveal nodes, bias card pools, tech research, modify hazards, locate Gate Shards |
| **Gate Shards (GS)** | Rare objective trophies from Gate Shrines and deep-space anomalies | Open the Mythic Crown; generally not spendable in ordinary shops |

**UI principle:** Five spendable resources plus one progress key are the practical upper limit. Gold on a map is *not* directly equivalent to Coalition Credits; a colony must secure an export charter or related objective to monetize it at the overworld layer.

## 4.3 Turning a built colony into exports

Each colony starts with a neutral, free **Charter Beacon** on its landing zone. It is not a deck card and does not consume one of the player's building placements. It counts local colony activity toward **three objective stamps**:

1. **Establish:** Meet the local Influence objective and basic survival conditions.
2. **Specialize:** Meet at least one export-related milestone appropriate to the site (e.g., extract three Precious-tagged deposits, transform Ice five times, generate Biomass on Bio-Loam four times, trigger three distinct Signal/Crystal interactions).
3. **Integrate:** Finish with at least one active cross-clan interaction and connect a relevant production/transport tag to the Beacon's district.

**At completion**, choose one of two or three **Colony Charters**. Each charter defines a primary world resource, secondary output, route bonus, and vulnerability. A generic colony may not export everything: a gold site with Mining infrastructure might become a Mint, while the same site with Kepler/Hearthline systems becomes a Free Trade Enclave.

### Suggested charter math (starting balance)

- **Claim Shipment:** `2 + abundance rating of primary export family + 2 per completed export stamp beyond Establish` units of its primary world resource; cap 11. Secondary shipment is usually 1–3 units.
- **Route Yield:** An active, supplied colony delivers `1 + floor(primary abundance / 2)` units of its primary world resource **per eligible expedition jump**, capped at 3; secondary yield is normally 0 or 1.
- **Production Charges:** Ordinary colonies hold **4 production charges**. Each time a route collects yield, one charge is spent. Colonies do not generate infinite output. They can be restocked once by paying a route service cost or through a matching clan technology.
- **High-quality building:** Achieving an optional "Masterwork" milestone grants +1 production charge and one route perk, not simply a huge score multiplier.

These values are tuning targets. The key is **once-per-jump production, limited charges, and requiring connection**, so players are rewarded for routes but cannot stand still and farm them indefinitely.

### Example: Nacre-9, an Ice-5 colony

The player builds Cryostead Frost Traps and a Heliarch Solar Furnace, transforming Ice into Water and back. The charter records five Ice/Water transformations and a cross-clan trigger. The player selects **Cryogenic Export Depot** and receives **9 CY immediately**, plus a trade output of **3 CY per qualifying expedition jump for four jumps**, as long as the route remains active. A future Gene Ark charter on this same world could instead favor Gene Archives if the player built a meaningful biological ecosystem.

## 4.4 Trade, exchange, and scarcity

A **Freeport Exchange** trades resources at intentionally imperfect rates, preventing total softlocks without making geography irrelevant. Illustrative base prices:

- Sell 2 AL, 2 CY, or 2 GE for 3 CR.
- Buy 1 AL or 1 CY for 3 CR; buy 1 GE for 4 CR; buy 1 DA for 5 CR.
- Trade 2 DA for 1 of AL/CY/GE when a specialized merchant is available.

Prices shift by region modifiers and supply conditions (e.g., a frozen sector may value AL more than CY). The preview always shows the exact quote; exchange offers never consume local resource tiles.

The economy aims to make a player say: *"I want that extraordinary alien-biome asteroid because my planned clan upgrade needs Gene Archives, even though the shorter route has more gold."*

---

# 5. Trade Routes as an Actual Puzzle

## 5.1 Three stages of a connection

1. **Surveyed Lane:** Shows two nodes can connect and displays distance, weather, and hazards. Does not produce trade.
2. **Built Lane:** Pay resources to construct the relay/convoy route between two claimed nodes. The lane carries a capacity value and a maintenance condition.
3. **Supplied Lane:** The built lane is linked by an unbroken chain to the Arkship Meridian (or a functioning connected Freeport); only now do colonies export their per-jump yields.

A colony claimed off-network still provides its immediate Claim Shipment, but its recurring exports stay dormant until connected. This creates a compelling tension between exploratory leaps and building a connected civilization.

## 5.2 Lane distance, upkeep and throughput

| Lane class | Typical map distance | Construction cost | Capacity | Qualifier |
|---|---|---|---:|---|
| **Short Relay** | 1 jump unit | 2 AL + 1 CR | 3 cargo units/jump | Basic infrastructure |
| **Midrange Convoy** | 2 units | 4 AL + 2 CR | 5 cargo units/jump | Safe if adequately surveyed |
| **Deep-Space Thread** | 3 units | 6 AL + 2 DA + 2 CY | 6 cargo units/jump | Exposed to major route crises |
| **Wormhole Stitch** | Rare cross-sector shortcut | 4 AL + 5 DA + 1 GS-equivalent relic charge* | 8 cargo units/jump | Optional legendary connection |

*The relic charge is an optional quest reward, **not** one of the mandatory Gate Shards needed to enter the finale. Mandatory keys cannot be irreversibly spent on infrastructure.*

**Capacity** limits how many units can travel through a lane per jump, aggregated across its downstream colonies. Where several exports compete, the player sets three simple **Trade Policies**: `Balanced`, `Priority: Fuel/CY`, or `Priority: Chosen Resource`. No individual cargo micro-routing is required. A network with multiple parallel routes can avoid bottlenecks and preserve income when one link goes down.

**Movement cost:** Each world-to-world jump costs 1 CY for a short hop, 2 CY for a midrange hop, or 3 CY for deep space. Some free starting travel allowance applies in Ark Reach; the fleet always shows a reachable-return projection so users can avoid accidental fuel traps. A built and supplied lane provides **one travel-cost discount CY** (minimum zero) when traversed, rewarding route investment.

## 5.3 Route disruptions that invite response

- **Micrometeor Swarm:** A lane loses 2 capacity until repaired using AL.
- **Ion Blackout:** A lane produces no exports on the next jump; pay DA to forecast/bypass or use a parallel path.
- **Customs Dispute:** Trade charter yields less CR for two jumps; spend CR to negotiate or prioritize another resource.
- **Biological Quarantine:** GE shipment pauses; spend CY for cold-chain stabilization.
- **Gravity Shear:** A deep-space connection requires temporary CY upkeep or its traffic reroutes.

Events are telegraphed a jump ahead on surveyed lanes. A lane can be upgraded with **Armor (AL)**, **Cold Chain (CY)**, **Signal Beacons (DA)**, or **Diplomatic Clearance (CR)** to reduce specific disruption types. This should feel like shaping an interstellar infrastructure web, not repetitively paying taxes.

## 5.4 Graph decisions and inter-colony synergy

Three structural forms should all be valid:

- **Branching tree:** Cheapest to expand, vulnerable to upstream failure.
- **Trade ring:** Expensive initially, but exports can detour during a hazard and connected colonies earn a resilience bonus.
- **Hub-and-spoke:** High capacity around a Relay Rock or Freeport, excellent efficiency until the hub is disrupted.

When **three colonies** of different charter types are connected in a ring, choose a **Trade Compact**: e.g., `Industrial Cycle` gives +1 AL per qualifying jump, `Living Circuit` restores one GE production charge to a colony once, and `Cryo Logistics` reduces one long-distance travel expense. This rewards constructing systems on the star map just as building adjacency rewards combinations locally.

## 5.5 No idle farming

There is **no Wait button** that advances resource income for free. Only committing to a meaningful expedition action (departing for a node, rescuing a site, or intentionally carrying out a limited sector event) advances the trade clock. Each action advances **Frontier Pressure**. Completed charters have capped production charges. A fleet therefore cannot circle one safe pair of nodes forever to trivialize the final boss.

---

# 6. Clan Diplomacy, Roster Swaps, and Clan Worlds

## 6.1 Starting treaty

At expedition start the player picks **exactly 3 of 9 clans**. This determines:

- Three initially active clan card pools on each ordinary colony map.
- Basic clan-specific starter cards.
- The default one-third share of card draws for each clan (modifiable later).
- One small starting **Diplomatic Trait** per clan (minor consistency bonus, not a large stat buff).
- Special conversations, export charter options, and world-event responses.

A fully unlocked profile can select any of the nine at launch; campaign-specific unlocks make additional clans available **within that expedition**, even if they were not part of the starting three. Optional meta-progression may gradually unlock the initial starting roster for brand-new players, but that is distinct from expedition diplomacy.

## 6.2 Clan Enclave world (forced invitation, voluntary replacement)

When the player selects a Clan Enclave, its resident clan extends a **Guest Treaty**:

1. The player chooses **one current active clan to bench**.
2. On this colony map, the resident clan occupies that slot, so exactly **three clans remain active**. The benched clan contributes no new cards on this map, but all expedition-wide investments and cards owned by that clan are retained.
3. The guest clan receives one suitable **loaner starter card** and a resource patch to demonstrate its identity. A guest clan has its normal purchased/available building pool if already unlocked.
4. On securing the enclave colony, the player gains a **Clan License**. That clan is now permanently available **for lineup swaps later in this expedition**. If the colony fails, the player retains a weaker Contact token instead; a revisit/rescue or purchase can complete the license.
5. Leaving the enclave restores the prior three-clan roster by default. The new clan **does not automatically displace the player's original lineup for every map**.

This makes enclave nodes tempting rather than mandatory: they are controlled experiments with a new playstyle and can permanently broaden strategic options.

### Example

Starting clans: **Ironwake + Heliarch + Verdant**. The player reaches **Kepler Cartographers Enclave** and benches Heliarch for the local map: **Ironwake + Verdant + Kepler**. Securing the colony licenses Kepler. At the next friendly Freeport, the player can spend **2 CR + 1 DA** to register **Ironwake + Kepler + Heliarch** for the next standard colony. All prior investment in Verdant remains intact and can be used again in future.

## 6.3 Where lineup changes are allowed

- **Enclave landing:** One free temporary forced-class invitation (player chooses which slot is replaced).
- **Friendly Freeport / Arkship visit:** Pay a small treaty amendment fee for one lasting active-slot swap.
- **Mobile Embassy fleet upgrade:** Allows one between-colony swap without needing to visit a Freeport, once per region.
- **Never mid-colony:** The current colony's three-clan pool is fixed until it is completed or abandoned.

The economic tension is intentional: benching a heavily upgraded clan may hurt the next run, while investing in a newly encountered clan can unlock a much stronger answer to a distant hazard.

## 6.4 The nine clans

| Clan | Identity | Local specialization | Overworld association |
|---|---|---|---|
| **Ironwake Union** | Excavators | Ore, Caverns, Alloy, Anchors | More AL from industrial charters; cheaper relay foundations |
| **Heliarch Array** | Sunforged | Sunlight, Heat, Power, rotation | Improved solar supply drops and storm forecasts |
| **Cryostead Enclave** | Frostkeepers | Ice, Water, Shadow, Cold | CY yields, reduced deep-travel losses |
| **Verdant Exodus** | Terraformers | Bio-Loam, Biomass, living links | GE yields and biological starter kits |
| **Synapse Circuit** | Machine Minds | Signal, remote triggers, repeats | DA boosts, surveying and card-bias efficacy |
| **Wreckborn Fleet** | Reclaimers | Scrap, demolition, recycling | Salvage sites, derelict rewards, rescue discounts |
| **Kepler Cartographers** | Orbitwrights | Orbit, Cargo, Tethers, gravity | Lane capacity and range discounts |
| **Hearthline Compact** | Colonists | Habitat, Pressure, Trade, Culture | CR tariffs and colony-integration rewards |
| **Umbra Institute** | Anomaly Researchers | Radiation, Time, Exotic, rule-bending | Gate research, exotic charters, dangerous shortcuts |

---

# 7. The Clan Directorate: Investing in Your Draw Pool

The **Clan Directorate** is an overworld screen where the player spends world resources to customize which building cards can be drawn on future colony maps. Changes persist for the **current expedition** (unless a purchase explicitly says otherwise). A player's earned resources therefore turn into more reliable combo engines rather than only passive stat upgrades.

## 7.1 Two-stage card draw

1. **Choose a clan** using current **Clan Presence weights**.
2. **Choose an eligible building** within that clan using **card weights**, filtering out banned cards and locked tiers.

Each newly drawn card independently follows this procedure. With three clans weighted `1 / 1 / 1`, they have equal clan selection probability. If Ironwake has weight `2` and the others remain at `1`, its theoretical share becomes **50%** instead of one third, before individual card eligibility is considered.

**Eligibility:** Each clan begins with its five Early buildings. Its five Mid buildings enter the pool after colony era 2 or through research. Its five Advanced buildings enter after era 4 or an expedition blueprint unlock. Every unlocked building begins at weight **1** unless intentionally banned.

### Explicit controls

| Directorate action | Suggested world cost | Effect / limit |
|---|---|---|
| **Raise Clan Presence I** | 3 CR + 2 DA | Clan weight `1→2` for future colonies |
| **Raise Clan Presence II** | 6 CR + 4 DA | Clan weight `2→3`; max 3 per clan |
| **Blacklist a card** | 3 CR + 2 DA | Selected card no longer appears in draws this expedition; max 2 bans per clan and 4 globally |
| **Restore a blacklisted card** | 1 CR | Return that card at its prior weight |
| **Favor a specific card I** | 2 CR + 2 DA | Card weight `1→2`; double base odds among eligible cards of that clan |
| **Favor a specific card II** | 5 CR + 4 DA | Card weight `2→3`; max 3 |
| **Acquire a shop-only blueprint** | See Card Foundry | Adds a new building to a clan's eligible card pool, initially weight 1 |
| **Research a tier early** | 3 DA + 2 AL | Mid or Advanced pool comes online one era sooner on future colonies |
| **Refund one card-pool decision** | 4 CR + 2 DA | Remove an investment or ban and refund 50% of its original cost, rounded down |

**Guardrails:** Players cannot blacklist a mandatory starter card if it is the last accessible building capable of enabling that clan's basic engine. Changes must always leave at least three eligible cards in each active clan pool. Clan Presence investments on benched clans are preserved but inactive until that clan returns.

**Why weight instead of guarantee?** Favoring a card should be meaningfully felt but should not let every run degenerate into playing the identical five-card sequence. A rare **Guaranteed Dispatch** consumable can separately ensure that one purchased blueprint is among the next colony's first three cards.

## 7.2 Clan enhancements: broad identity versus narrow consistency

A separate **Clan Enhancement** track spends world resources on a clan's behavior. Suggested maximum: **two upgrades per clan per expedition**, choosing between three thematic branches. Effects apply on *future colony maps while that clan is active*, and cannot be stacked onto a benched clan.

| Clan | Branch A: production | Branch B: spatial identity | Branch C: risk / economy |
|---|---|---|---|
| Ironwake | First Ore extraction each map creates +1 loose Metal | One Mining building gains +1 range for its first activation | First excavation Integrity loss each map reduced by 1 |
| Heliarch | First Solar building to enter Sunlight each rotation scores +2 | Place one starting Thermal Mirror support marker | Once per map, prevent a solar storm's damage to one district |
| Cryostead | First Ice→Water conversion each map also makes a spare Water | One initial hex starts permanently Shadowed | First Cryo-hazard injury is prevented |
| Verdant | Start with one Bio-Loam patch next to the landing area | Root-network Bio effects gain +1 effective range once/turn | First temporary Pressure zone lasts one additional turn |
| Synapse | First repeated activation each map grants +3 Influence | Place a neutral one-hex Signal relay | First Signal network split during an event is ignored |
| Wreckborn | First Scrap consumed each map creates a spare Scrap | Starting zone includes one Wreckage deposit | The first friendly structure dismantled can be recovered as a card |
| Kepler | First orbital Cargo delivery each map scores +4 | Gain one additional usable Orbital slot | First orbital hazard each map is forecast one turn earlier |
| Hearthline | First Pressurized Habitat each map scores +4 | Landing area begins with one adjacent Pressure hex | First habitable-zone damage on each map is prevented |
| Umbra | First Anomaly interaction each map scores +5 | Reveal one nearby hidden Anomaly | First Radiation event caused by a friendly Umbra building is canceled |

**Costs:** first enhancement `3 thematic resource + 2 CR`; second `5 thematic resource + 3 DA`. Thematic resource maps sensibly to each clan (e.g. AL for Ironwake/Kepler, CY for Cryostead, GE for Verdant/Hearthline, DA for Synapse/Umbra, CR/AL for Wreckborn and Heliarch). Effects should be small at map start, not unconditional multipliers that overshadow building placement.

## 7.3 Card Foundry: buy new cards for each clan

The Foundry features **shop-only blueprints** in addition to the baseline 15 buildings per clan. Buying a blueprint adds that building to the clan's pool for the current expedition. A purchased blueprint is not placed automatically on the colony map; the player can subsequently Favor it like any other card. Some blueprints are offered only after visiting a relevant world or discovering an appropriate resource.

**Shop cadence:** Every cleared sector refreshes the Foundry with six offers: two related to active clans, two related to licensed/encountered clans, and two wildcard offers. Freeports may refresh for CR. This prevents the shop from becoming a catalog that players buy out every run.

**Shop blueprint examples: two per clan (18 total, separate from the baseline 135):**

| Clan | Foundry-only card | Cost | Tags and mechanical purpose |
|---|---|---|---|
| Ironwake | **Auric Assayer** | 4 AL + 3 CR | `Mining · Precious`: when Gold Vein is harvested within range 2, gain +6 Influence and strengthen the next colony's Mint charter stamp |
| Ironwake | **Microfault Weaver** | 5 AL + 3 DA | `Anchor · Mining`: stabilize a new Cavern; on Stabilize, reveal an adjacent buried deposit |
| Heliarch | **Eclipse Capacitor** | 4 CY + 3 DA | `Solar · Storage`: store energy during Sunlight; on Shadow, spend it to activate an adjacent Cold or Power building |
| Heliarch | **Spectral Splitter** | 4 AL + 4 DA | `Light · Crystal`: a Crystal receiving reflected light relays that light to a second hex |
| Cryostead | **Perihelion Catcher** | 4 CY + 3 CR | `Cold · Orbital`: when a Hot hex cools, collect vapor as Water and gain Influence |
| Cryostead | **Isotope Distillery** | 5 CY + 3 DA | `Ice · Fuel`: consume Water or Gas to create Fuel; scores extra on Ice-rich maps |
| Verdant | **Loam Choir** | 5 GE + 2 DA | `Bio · Soil`: whenever Bio-Loam supports Biomass production, duplicate the next Growth scoring event |
| Verdant | **Pollen Aerostat** | 4 GE + 3 CR | `Bio · Orbital`: on Pressure expansion, create Bio-tagged Cargo at a linked orbital port |
| Synapse | **Priority Router** | 5 DA + 2 CR | `Signal · Automation`: once/turn, select which of two eligible connected buildings receives a repeat activation |
| Synapse | **Simulacrum Port** | 4 AL + 4 DA | `Drone · Echo`: create a one-turn tag copy of an adjacent building, but not a copy of its effect |
| Wreckborn | **Goldleaf Recycler** | 4 AL + 4 CR | `Salvage · Precious`: Gold and Scrap within range 2 count as each other's tags for one consumer per turn |
| Wreckborn | **Scuttle Permit** | 5 CR + 3 AL | `Salvage · Culture`: once per era, dismantle a building without losing the card permanently; nearby Habitats score |
| Kepler | **Trade-Sling Array** | 5 AL + 4 CY | `Orbit · Cargo`: first Cargo launched each turn can arrive at any friendly docking slot on the same map |
| Kepler | **Lane Survey Probe** | 4 DA + 4 CR | `Signal · Orbit`: survey a local meteor lane, award Influence, and earn one map-end export stamp if it succeeds |
| Hearthline | **Mint Atrium** | 5 CR + 3 AL | `Habitat · Precious`: Gold-tagged mining near a Pressurized Habitat counts toward commerce and citizen scoring |
| Hearthline | **Quarantine Market** | 4 GE + 3 CR | `Trade · Shield`: a Cargo delivery rewards Influence; protects one connected Bio building from environmental harm |
| Umbra | **Veil Interferometer** | 6 DA + 2 CY | `Exotic · Signal`: on an Anomaly appearing, choose one of two nearby buildings to reactivate; adds Radiation |
| Umbra | **History Splicer** | 5 DA + 5 CR | `Time · Salvage`: when a building is destroyed, echo its last valid transformation effect once next turn |

**Design rule:** A purchased card should provide a new type of interaction or route toward a build, not a strictly superior version of a common card.

---

# 8. Other Overworld Spending: Make the Next Colony Different

In addition to the Directorate and Foundry, the player can spend world resources on **one-shot colony preparations**, lasting only for the next selected map. The player normally has **two Preparation Slots**, expandable to three with a fleet upgrade; buying everything is not an option.

| Preparation | Cost | Effect on the *next* colony map |
|---|---|---|
| **Deep Prospect Scan** | 2 DA | Reveal three additional buried deposits and one hidden fault before first placement |
| **Gold Survey Lease** | 2 CR + 1 DA | Guarantee one Precious-tagged deposit near the landing zone if terrain permits |
| **Bulkhead Drop** | 3 AL | Start with one neutral Anchor and a Stable landing hex |
| **Cryo Emergency Pod** | 2 CY | Start with two Ice deposits or one Water token, chosen on landing |
| **Gene Seed Vault** | 2 GE | Plant Bio-Loam and an adjacent Organic resource near the start |
| **Orbital Survey Buoy** | 2 DA + 1 AL | Reveal all Orbital slots; one starts connected to a neutral launch relay |
| **Meteor Diversion Permit** | 3 DA + 1 CY | Reroute one forecast meteor during the first era to a legal hex |
| **Consolidated Charter** | 3 CR + 2 AL | The colony starts with one export objective stamp already complete, but still must meet its Influence thresholds |
| **Emergency Shuttle** | 3 CY + 2 CR | Once per map, leave safely after a failed checkpoint, preserving partial charter goods but not the colony |
| **Special Blueprint Dispatch** | 4 CR + 2 DA | Put a chosen owned building among the first three offered cards, obeying clan eligibility |
| **Surface Regrading** | 3 AL + 2 DA | Before turn 1, shift one exposed resource deposit to a different legal hex within range 2 |
| **Hazard Insurance** | 2 CR + 2 AL | Negate the first Asteroid Integrity loss caused by an external event |

### Fleet upgrades (persistent within an expedition)

- **Survey Mast** — `4 DA + 3 AL`: reveal two additional world-node previews per sector.
- **Cargo Keel** — `5 AL + 3 CR`: +2 throughput on one selected route originating from the Arkship or a Freeport.
- **Cold-Chain Engine** — `4 CY + 4 AL`: first long-distance jump in each sector costs 1 less CY.
- **Mobile Embassy** — `5 CR + 4 DA`: one active-clan swap per sector without visiting a Freeport.
- **Third Preparation Slot** — `6 AL + 4 CR`: carry three one-shot pre-mission preparations instead of two.
- **Rescue Tug** — `4 AL + 3 CY`: the first Stranded Site recovery each expedition costs less.

**World-to-local causality must always be visible:** if a player buys Gene Seed Vault, the newly planted Bio-Loam appears on the local hex map and immediately supports the Verdant engine. If they research an Orbital Survey Buoy, they see the extra orbital relay when they land. Overworld choices should never feel like invisible +5% modifiers.

---

# 9. The Colony Map in Detail

## 9.1 Map layers

**Surface:** sunlight, direct meteor exposure, Gold/Ore deposits, Bio-Loam, cryo-ice, gas vents, and connectors.  
**Caverns:** excavated or pre-existing interior spaces, radiation pockets, sheltered habitats, cold storage, and mineral veins. Removing rock opens placement space but may reduce Integrity.  
**Orbit:** a small number of docking/utility slots around the asteroid, linked by Tethers, Launch Rails, Skyhooks, and other buildings. Orbit is a spatial connector and shipping engine, not a large free buildable sheet.

A standard colony might have roughly 45–65 visible surface hexes, 10–25 buried or cavern hexes, and 3–6 orbital slots. Late asteroid maps are somewhat larger; superplanets use multiple connected regional boards and an orbital layer rather than simply presenting an impossible 300-hex canvas all at once.

## 9.2 Environmental cycle

- Asteroid illumination rotates through **four phases**: Dawn → High Sun → Dusk → Deep Night.
- Sunlit/Shadow depend on orientation; Craters or Shade Screens may create permanent Shadow.
- Hot/Cold, Radiation, Pressure, Stable/Unstable, and Shielded are visible status tags.
- Ice melts when exposed to appropriate heat effects; Water freezes through eligible cold effects. They do **not** automatically oscillate just because their tags changed unless a building or declared environmental event converts them.
- Impacts add terrain and resources, sometimes damaging structures. Forecasts provide counterplay.
- Normal buildings can activate a maximum of **twice per turn**. Umbra and a few special systems can exceed this cap explicitly, generally by one.

## 9.3 Tags, resources, and compatible targeting

**Natural resource families**

| Resource | Tags | Main roles |
|---|---|---|
| Iron-Nickel Ore | `Ore · Metal · Mineral` | Extract into Metal, refine to Alloy, open caverns |
| Gold Vein | `Ore · Metal · Mineral · Precious` | High-value prospecting, special charters, trade/culture combos |
| Cryo-Ice | `Ice · Cold · Volatile` | Melt into Water, condense, freeze, fuel and cold ecosystems |
| Volatile Gas | `Gas · Fuel · Volatile` | Heat, energy, refining, exotic experiments |
| Photonic Crystal | `Crystal · Mineral · Light` | Signal relays, optics, anomaly research |
| Bio-Loam | `Organic · Bio · Soil` | Cultivation, pressure ecosystems, xenobiology |
| Organic Seam | `Organic · Bio · Dormant` | Converted into Biomass by life sciences |
| Ancient Wreckage | `Wreck · Scrap · Artificial` | Salvage and reuse |
| Exotic Anomaly | `Anomaly · Exotic · Radiation` | Risky repeat/physics effects |
| Regolith | `Dust · Mineral` | Excavation, fabrication, substrate |

**Created loose resources:** Metal (`Metal`), Scrap (`Scrap · Metal`), Alloy (`Alloy · Metal`), Water (`Water`), Biomass (`Bio · Organic`), Fuel (`Fuel · Volatile`), Gas (`Gas · Volatile`), Cargo (`Cargo`, plus its original source tag when appropriate). A loose resource occupies an available resource spot; transformations replace their source token unless the card says otherwise.

**Environmental tags:** `Sunlit`, `Shadow`, `Hot`, `Cold`, `Pressure`, `Radiation`, `Stable`, `Unstable`, `Shielded`.  
**Network tags:** `Link`, `Signal`, `Power`, `Orbit`, `Cargo`, and relevant connected habitat/Bio/Mining networks.

**Legal ranges:** Adjacent = one hex, Range 2 = two hexes, Connected = an actual compatible link path, Orbital = via a slot/tether/shuttle relationship. Shared tags alone do *not* make two buildings remotely connected.

## 9.4 Trigger glossary

| Trigger | Meaning |
|---|---|
| On Build | On the building being placed |
| Every Turn / Every N Turns | Timer-based activation |
| On Create | A qualifying resource or tag enters play |
| On Consume | A qualifying resource is used up |
| On Transform | A resource changes type |
| On Destroy | A structure ceases to exist |
| On Connect | A new compatible network link is established |
| On Rotation | Light, Shadow, or direction changes |
| On Heat / Cooling | Hot appears or is removed |
| On Impact | A meteor or relevant impact occurs |
| On Launch / Arrival | Cargo enters/leaves orbit |
| On Extraction / Excavation | A deposit is harvested or solid rock becomes Cavern |
| On Repeat | An eligible activation is repeated |

**Resolution order:** (1) player action, (2) resource/terrain changes, (3) triggers caused by those changes, (4) repeat triggers subject to caps, (5) timed environment update, (6) subsequent triggers and scoring, (7) exports/charter stamp evaluation. A queue resolving oldest event first is a sufficient conceptual rule; the game should clearly show origin and target of every activation.

**Anti-loop design:** A building that would activate a third time does not unless an effect specifically grants an extra activation. A single resource token cannot be consumed twice. A card that creates resources must find legal space or fail gracefully. A replay/echo of a transformation must still have a valid target, preventing resource duplication from nothing unless that duplication is the card's explicit effect.

## 9.5 Cards, influence, and checkpoints

- **One card played per turn**, with some rare effects creating bonus placement exceptions.
- **Draw 1–3 new cards** each turn: one by default, +1 if effects from at least two of the active clans resolved in the previous turn, +1 if all three activated. Each draw is selected using the overworld's clan/card weights.
- Unplayed cards persist in a hand of up to five; when full, scrap one for a small local Influence consolation or use a rare overwrite effect. Scrap here is a **hand action**, not a physical Scrap resource unless a card explicitly says it generates one.
- Buildings earn **Influence** through activation, combinations, ecosystem milestones, and clever terrain usage. Influence is **local score only**, not a stackable world resource.
- At roughly turns 5, 10, 15, and 20, meet scaling Influence thresholds. World hazard and optional contracts alter the expected scores. Difficulty should be expressed primarily through terrain and scoring constraints, not simply giant multipliers.
- **Asteroid Integrity** starts at 10 on ordinary maps. Mining and hostile events can reduce it; Anchors and protections preserve it. At 0, the colony fractures.
- Every map features one primary charter goal and up to two optional prestige goals, so huge score combos are useful but aren't the only path to an excellent world resource payout.

---

# 10. Complete Base Building Catalogue — 135 Cards

There are **15 base building cards per clan**, divided into **five Early**, **five Mid**, and **five Advanced** cards. The numbers are starting balance suggestions. These are the baseline 135; the Card Foundry adds the 18 optional shop-only buildings listed earlier.

**Notation:** `E`, `M`, `A` mean Early, Mid, Advanced. A card's written tags are always active while it is on the map. Effects act on eligible nearby resources/buildings only, and reactivations respect the normal cap unless they explicitly say otherwise. Where a building produces a resource, an available legal space is required.

## 10.1 Ironwake Union — Excavators

**Theme:** Excavation, mining, alloy production, Caverns, instability. **Core tension:** Take the immediate value of a deposit or preserve it for a future structure.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Prospector Nail** | `Mining · Signal` | **On Build:** Reveal up to two buried Ore deposits within range 2. +2 Influence per reveal. Gold Veins qualify as Ore. |
| E | **Pit Drill** | `Mining · Metal` | **Every 2 turns:** Extract adjacent Ore into loose Metal. +4 Influence. Precious deposits also satisfy Gold charter stamps. |
| E | **Gravity Anchor** | `Anchor · Structure` | **On Build:** Stabilize adjacent Unstable hexes; neighboring Mining activations score +1. |
| E | **Regolith Rake** | `Mining · Dust` | **On Build:** Clear up to two adjacent Regolith deposits and make their hexes buildable. +3 per cleared deposit. |
| E | **Ore Shuttle** | `Cargo · Link` | **On Consume:** When Metal-tagged resources are consumed within range 2, +3; optionally move a nearby loose resource one hex. |
| M | **Mantle Cutter** | `Mining · Heat` | **On Build:** Excavate one adjacent solid hex into a Cavern, place Hot there, +6. |
| M | **Magnetic Separator** | `Metal · Industry` | **On Extraction:** First Ore harvested within range 2 each turn also creates one loose Metal on a legal hex; +3. |
| M | **Smelting Stack** | `Metal · Heat` | **Every 2 turns:** Turn adjacent loose Metal or Scrap into Alloy; +5; apply Hot to the building. |
| M | **Seismic Geophone** | `Signal · Mining` | **On Excavation:** A new Cavern within range 2 repeats one eligible Mining building; +3. |
| M | **Slag Dump** | `Waste · Dust` | **On Create:** Alloy appearing within range 2 generates one loose Dust on an adjacent free hex; +3. |
| A | **Tunnel Spine** | `Link · Structure` | **Passive:** Connected Caverns form a Mining network. Mining activations across that network score +2. |
| A | **Strip-Drill Array** | `Mining · Impact` | **On Build:** Extract up to three Ore deposits within range 2; +5 per deposit, then make one affected hex Unstable. |
| A | **Forge Cathedral** | `Industry · Metal` | **On Create:** Alloy appearing within range 2 gives +8; the next adjacent Metal consumer gains +2. |
| A | **Core Lattice** | `Anchor · Link` | **On Build:** Stabilize neighboring Caverns; connected Mining buildings gain +1 range. |
| A | **Crustbreaker** | `Mining · Impact` | **On Build:** Excavate up to three connected rock hexes, revealing buried resources; +7 per hex, but lose 2 Integrity. |

**Signature cascade:** Cavern opens → Geophone reactivates Pit Drill → Ore becomes Metal → Smelting Stack produces Alloy → Forge Cathedral scores → Slag Dump creates Dust for future use.

## 10.2 Heliarch Array — Sunforged

**Theme:** Sunlight cycles, Power, Heat, reflected light. **Core tension:** Build for the future lighting phase, not only the current turn.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Sunfoil Canopy** | `Solar · Power` | **Every Turn:** +3 while Sunlit. |
| E | **Thermal Mirror** | `Light · Structure` | **Passive:** While Sunlit, illuminate one neighboring Shadow hex for card effects. |
| E | **Radiator Fin** | `Cold · Power` | **On Heat:** When an adjacent hex gains Hot, remove Hot there and score +3. |
| E | **Photon Kiln** | `Heat · Industry` | **On Rotation:** On becoming Sunlit, heat one adjacent hex; +3 for each Mineral deposit adjacent to that hex. |
| E | **Sunclock Relay** | `Signal · Solar` | **On Rotation:** On changing between Sunlit and Shadow, +3 and reactivate one adjacent Solar building. |
| M | **Solar Furnace** | `Heat · Power` | **Every Sunlit Turn:** Melt adjacent Ice into Water, +6. Without Ice, apply Hot to an adjacent hex instead. |
| M | **Capacitor Bloom** | `Power · Storage` | **Every Sunlit Turn:** Store one Charge (maximum 3). On entering Shadow, spend a Charge to reactivate an adjacent building. |
| M | **Helium Skimmer** | `Fuel · Solar` | **Every 2 Sunlit Turns:** Harvest an adjacent Gas deposit into Fuel; +5. |
| M | **Prism Farm** | `Crystal · Light` | **Every 2 Sunlit Turns:** +3 per Crystal within range 2, up to four Crystals. |
| M | **Dawn Siren** | `Signal · Light` | **On Rotation:** When a connected Power building enters sunlight, activate another connected Power building; +4. |
| A | **Heat Pipeline** | `Link · Heat` | **Passive:** Send Hot along its connected network; each newly heated building earns +2. |
| A | **Flare Harvester** | `Power · Shield` | **On Solar Storm:** Protect itself and adjacent Power buildings from storm damage; +12 per such storm. |
| A | **Stellar Smelter** | `Metal · Heat` | **Every Sunlit Turn:** Transform adjacent Metal or Scrap into Alloy, +7, and heat the hex. |
| A | **Daystar Engine** | `Solar · Motion` | **Once per era:** Spend three stored Charges to advance illumination one additional phase; +4 per building changing Sunlit/Shadow, cap +20. |
| A | **Corona Crown** | `Solar · Power` | **On Solar Activation:** Once per turn, repeat the first Sunlit-triggered effect within range 2, then +5. |

**Signature cascade:** Rotation causes dawn → Sunclock Relay wakes the solar district → Furnace creates Water → Radiator Fin captures waste heat → Capacitor stores energy for night → a future sunset releases it.

## 10.3 Cryostead Enclave — Frostkeepers

**Theme:** Ice/Water cycles, refrigeration, volatile storage, permanent Shadow. **Core tension:** Consume Ice now or conserve it as the source of recurring future triggers.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Ice Harvester** | `Ice · Extraction` | **Every 2 turns:** Convert adjacent Ice to Water; +4. |
| E | **Shade Screen** | `Cold · Structure` | **Passive:** Keep one neighboring hex in permanent Shadow; adjacent Cold buildings score +1. |
| E | **Frost Trap** | `Cold · Volatile` | **On Create:** Water appearing on an adjacent Shadow hex freezes to Ice; +4. |
| E | **Vapor Collector** | `Water · Pressure` | **On Melt:** Ice melting within range 2 creates an extra Water token on a legal hex; +3. |
| E | **Brine Tank** | `Water · Storage` | **On Consume:** May store adjacent Water rather than discard it (up to three). Every 3 turns release one and gain +4. |
| M | **Thermal Valve** | `Cold · Heat` | **On Heat:** Remove Hot from an adjacent hex, +5; +3 more if Ice exists within range 2. |
| M | **Cryo Vault** | `Storage · Cold` | **Passive:** Protect neighboring resource tokens from heat and environment; +2 per protected token at era checkpoints. |
| M | **Sublimator** | `Ice · Gas` | **Every 2 turns:** Consume adjacent Ice on Hot terrain, create Gas, +6. |
| M | **Frost Lens** | `Crystal · Cold` | **On Rotation:** Crystal entering Shadow within range 2 functions as a temporary Signal relay; +3 per Crystal. |
| M | **Pressure Still** | `Water · Pressure` | **Every 2 turns:** Consume adjacent Water and apply temporary Pressure to neighboring hexes; +5. |
| A | **Comet Hook** | `Orbital · Ice` | **On Impact:** When an icy meteor arrives, duplicate one Ice deposit near the impact; +6. |
| A | **Glacier Loom** | `Ice · Structure` | **On Rotation:** On entering Shadow, transform adjacent Dust/Regolith to Ice; +4. |
| A | **Absolute Engine** | `Cold · Power` | **Every Shadow Turn:** If three Cold buildings are connected, +10 and repeat one Cold building within range 2. |
| A | **Permafrost Cathedral** | `Cold · Shield` | **Passive:** Shield Cold resources within range 2; +4 when destruction is prevented. |
| A | **Cryo-Tide Reactor** | `Ice · Power` | **On Transform:** Ice↔Water changes within range 2 award +6; once/turn reactivate an eligible responsible building. |

**Signature cascade:** Ice melts → Vapor Collector adds Water → Algae consumes Water → Frost Trap refreezes residual Water → Cryo-Tide Reactor scores both transformations.

## 10.4 Verdant Exodus — Terraformers

**Theme:** Alien ecology, Bio-Loam, Biomass, Pressure and growth. **Core tension:** Spread biomass into useful space or consume it to feed other production chains.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Spore Seeder** | `Bio · Growth` | **On Build:** Transform neighboring Organic Seam or Bio-Loam deposit into Biomass; +3. A consumed Bio-Loam patch ceases to enrich that hex. |
| E | **Algae Tank** | `Bio · Water` | **Every 2 turns:** Consume neighboring Water, create Biomass; +5. |
| E | **Carbon Net** | `Bio · Gas` | **On Create:** Gas appearing within range 2 awards +2; +4 more if Water is also in range. |
| E | **Root Tunnel** | `Bio · Link` | **Passive:** Connect neighboring Bio buildings into a root network; Bio transformations there gain +2. |
| E | **Oxygen Orchard** | `Bio · Pressure` | **On Create:** New adjacent Biomass extends Pressure to one nearby hex for two turns; +4. |
| M | **Myco Bloom** | `Growth · Bio` | **On Destroy:** A neighboring building's destruction creates Biomass on its vacant hex; +5. |
| M | **Symbiotic Cradle** | `Bio · Habitat` | **Every 2 turns:** +3 per adjacent Pressurized Habitat, max three. |
| M | **Lichen Harvester** | `Bio · Dust` | **Every 3 turns:** Transform neighboring Regolith or Dust into Organic Seam; +5. |
| M | **Radiotrophic Garden** | `Bio · Radiation` | **On Radiation:** Radiation appearing within range 2 gives +6; once/turn turn nearby Organic Seam into Biomass. |
| M | **Nectar Reactor** | `Bio · Fuel` | **Every 2 turns:** Consume neighboring Biomass to create Fuel; +6. |
| A | **Tendril Bridge** | `Bio · Link` | **Passive:** Bio buildings across one vacant Cavern hex count as adjacent for suitable effects. |
| A | **Bloomstorm Laboratory** | `Bio · Growth` | **On Create:** Every third Biomass appearing within range 2 creates two extra Biomass tokens on legal spaces; +5. |
| A | **Worldroot** | `Bio · Anchor` | **On Growth:** Biomass growing into a neighboring Cavern makes it Stable; +5. |
| A | **Living Shipyard** | `Bio · Orbital` | **Every 3 turns:** Consume Biomass from a connected root network, create Bio Cargo at an orbital dock; +9. |
| A | **Genesis Choir** | `Bio · Growth` | **On Create:** Once/turn, new Biomass in range 2 repeats one neighboring Bio building; +2 per Bio building in range. |

**Signature cascade:** Ice→Water → Algae→Biomass → Oxygen Orchard→Pressure → Habitat scores → Root Tunnel and Genesis Choir repeat the growth interaction. Bio-Loam-rich maps make that chain much easier to start.

## 10.5 Synapse Circuit — Machine Minds

**Theme:** Automation, tags as signals, remote activations, repeated triggers. **Core tension:** Invest placement space in infrastructure that makes *other* buildings much stronger.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Relay Pylon** | `Signal · Link` | **Passive:** Form a network with adjacent Signal structures; +2 each time a new Signal connection is formed. |
| E | **Survey Drone Port** | `Drone · Signal` | **Every 3 turns:** Reveal one hidden deposit within range 2; +3 per discovery. |
| E | **Trigger Coil** | `Automation · Power` | **On Periodic Activation:** Every other turn, repeat an adjacent building that just activated via its periodic timer. |
| E | **Cargo Bot** | `Drone · Cargo` | **Every 2 turns:** Move a loose resource one hex toward a compatible consumer; +3 if delivered. |
| E | **Array Beacon** | `Signal · Power` | **Every 3 turns:** Activate one Signal building within range 2; +3. |
| M | **Sensor Weave** | `Signal · Crystal` | **Passive:** Crystals within range 2 can relay eligible Signal effects across network gaps; +2 for each effect using a Crystal. |
| M | **Data Scriptorium** | `Data · Signal` | **Every Turn:** +2 per distinct building tag activated on its connected network, up to five. |
| M | **Replicator Bay** | `Drone · Metal` | **On Consume:** Metal consumed in range 2 grants Drone to one nearby Signal building for this turn; +4. |
| M | **Path Optimizer** | `Automation · Link` | **Passive:** First loose resource moved on its network travels one extra hex; successful delivery +4. |
| M | **Echo Switch** | `Signal · Automation` | **Every 2 turns:** Repeat the last eligible Create or Transform effect in range 2, with a valid target. |
| A | **Swarm Dock** | `Drone · Storage` | **Every 3 turns:** Repeat two different Powered Automation buildings within range 2; +5. |
| A | **Quantum Repeater** | `Signal · Exotic` | **On Repeat:** Two instances of the same activation type in range 2 trigger a third eligible building of that type; +6. |
| A | **Ghost Protocol** | `Signal · Salvage` | **On Destroy:** A connected destroyed structure leaves a two-turn Echo containing its old tags but no automatic effects; +5. |
| A | **Network Brain** | `Automation · Data` | **Every Turn:** +2 per distinct building tag that activated on the connected network, max +20. |
| A | **Cascade Singularity** | `Automation · Signal` | **On Repeat:** Once/turn when a network building activates for its second time, repeat a different connected building and score +8. |

**Signature cascade:** Resource creation triggers one building → the Trigger Coil repeats a producer → Sensor Weave distributes Signal → Network Brain scores tag diversity → Cascade Singularity redirects a second activation.

## 10.6 Wreckborn Fleet — Reclaimers

**Theme:** Salvage, destruction, mobility, demolition, resource return. **Core tension:** When does it become more profitable to tear down a building than keep it alive?

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Scrap Picker** | `Salvage · Scrap` | **On Consume:** Scrap or Wreckage consumed on a neighboring hex awards +4. |
| E | **Derelict Tug** | `Salvage · Cargo` | **On Build:** Move one Wreckage within range 2 to a legal neighboring hex; +3. |
| E | **Fuse Charger** | `Explosive · Heat` | **Every 2 turns:** Consume nearby Scrap, apply Hot to that hex, +5. |
| E | **Patchwork Hull** | `Structure · Scrap` | **On Destroy:** When a neighboring building is destroyed, this building becomes Shielded and scores +4. |
| E | **Breaker Yard** | `Salvage · Metal` | **Every 2 turns:** Transform neighboring Wreckage to Scrap; +5. |
| M | **Debris Mill** | `Salvage · Dust` | **On Destroy:** Destruction in range 2 creates Scrap on a free nearby hex; +3. |
| M | **Black Box Booth** | `Data · Salvage` | **On Consume/Destroy:** Lost Wreckage within range 2 awards +5 and one bonus building-card draw next turn. |
| M | **Ramjet Scow** | `Fuel · Motion` | **Every 3 turns:** Consume neighboring Fuel to relocate a movable building within range 2 to a legal neighboring hex; +6. |
| M | **Blast Fence** | `Shield · Structure` | **On Impact:** Once/era sacrifice itself to prevent nearby meteor damage, create two Scrap, +6. |
| M | **Reclaimer Loop** | `Scrap · Automation` | **On Consume:** First Scrap consumed in range 2 each turn creates one fresh Scrap on another free neighboring hex; +4. |
| A | **Jettison Bay** | `Cargo · Orbital` | **Every 2 turns:** Launch and consume a neighboring loose resource; +7 and emit Launch event. |
| A | **Scavenger Market** | `Trade · Scrap` | **Every Turn:** +3 per distinct resource type consumed in range 2 that turn, up to four types. |
| A | **Shipgrave Forge** | `Scrap · Metal` | **Every 2 turns:** Consume two neighboring Scrap tokens to create Alloy; +12. |
| A | **Catastrophe Engine** | `Explosive · Salvage` | **Once/era:** Destroy a friendly building in range 2, +5 per adjacent building, leaving Wreckage behind. |
| A | **Phoenix Ark** | `Salvage · Habitat` | **On Destroy:** Once/turn, a friendly building destroyed/dismantled within range 2 returns a copy of its card to hand; +8. |

**Signature cascade:** Demolish an obsolete structure → it becomes Wreckage → Debris Mill creates Scrap → Reclaimer Loop replaces consumed Scrap → Shipgrave Forge creates Alloy → Phoenix Ark gives the destroyed card back.

## 10.7 Kepler Cartographers — Orbitwrights

**Theme:** Gravity, orbit, far-reaching adjacency, Cargo transport. **Core tension:** Build an efficient local district or spend slots to connect distant districts into a more powerful machine.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Tether Node** | `Orbit · Link` | **On Build:** Connect a surface edge hex to a vacant Orbital slot; +2 when a resource passes through its tether. |
| E | **Launch Rail** | `Orbital · Cargo` | **Every 2 turns:** Launch neighboring Cargo to a connected orbital slot; +5. |
| E | **Microthruster** | `Motion · Power` | **Every 4 turns:** Rotate lighting one phase or shift a neighboring movable building one hex; +3. |
| E | **Radar Dish** | `Signal · Orbital` | **Every Turn:** Reveal next forecastable meteor position/type; +3 when one observed impact happens. |
| E | **Gravity Sling** | `Orbit · Cargo` | **On Arrival:** Once/turn redirect arriving Cargo to another connected Orbital slot; +5. |
| M | **Docking Hoop** | `Orbital · Trade` | **On Arrival:** Cargo entering its connected Orbital slot awards +6. |
| M | **Skyhook** | `Orbit · Link` | **Passive:** Link two Tether Nodes through orbit; their attached buildings can count as adjacent for compatible effects. First cross-link combo each turn gives +4. |
| M | **Mass Driver** | `Motion · Metal` | **Every 2 turns:** Consume neighboring Metal to create Metal Cargo in a connected Orbital slot; +7. |
| M | **Satellite Orchard** | `Orbit · Solar` | **Every Sunlit Turn:** +4 for each connected surface Solar building, up to three. |
| M | **Comet Net** | `Orbit · Ice` | **On Impact:** Capture a resource-bearing meteor, prevent damage, place its Ice/Ore on a free surface-edge hex; +6. |
| A | **Cycler Shuttle** | `Orbit · Habitat` | **Every 3 turns:** Export connected Water/Biomass as Cargo; +5, another +4 if a connected Habitat is Pressurized. |
| A | **Perigee Loom** | `Gravity · Orbit` | **On Rotation:** Shift one Orbital connection to the next surface sector; +3 per new connected building tag, up to four. |
| A | **Orbital Foundry** | `Orbit · Alloy` | **On Arrival:** Consume arriving Metal Cargo to make Alloy at the linked landing site; +12. |
| A | **Ring Habitat** | `Orbit · Habitat` | **Every Turn:** +4 per linked Pressurized Habitat, up to three. |
| A | **Shepherd Engine** | `Orbit · Motion` | **Once/era:** Redirect a forecast meteor to a chosen legal hex; +10 if it hits its destination. |

**Signature cascade:** Mass Driver converts Metal into Cargo → Gravity Sling changes its destination → Docking Hoop rewards arrival → Orbital Foundry consumes the Cargo into Alloy → surface Forge Cathedral scores that Alloy.

## 10.8 Hearthline Compact — Colonists

**Theme:** People, Pressure, protective neighborhoods, culture and trade. **Core tension:** How much space do you devote to habitable districts versus production infrastructure?

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Pressure Dome** | `Habitat · Pressure` | **On Build:** Pressurize neighboring hexes. **Every Turn:** +3 if another building is inside its Pressure zone. |
| E | **Airlock Junction** | `Habitat · Link` | **On Connect:** Join adjacent Pressure networks; +3 per newly connected Habitat, maximum four. |
| E | **Pioneer Quarters** | `Habitat · Citizen` | **Every 2 turns:** +3 per neighboring Pressurized building, maximum three. |
| E | **Community Galley** | `Habitat · Bio` | **On Consume:** Water or Biomass consumed in range 2 awards +4. |
| E | **Beacon Plaza** | `Culture · Signal` | **Every Turn:** +2 for each distinct active clan whose building triggered in range 2 this turn, up to three. |
| M | **Life Support Array** | `Pressure · Water` | **On Consume:** Neighboring Water consumption spreads temporary Pressure one hex and gives +5. |
| M | **Shielded Nursery** | `Habitat · Shield` | **Passive:** Shield neighboring Pressurized Habitats; +4 if damage is prevented. |
| M | **Transit Causeway** | `Link · Habitat` | **Passive:** Connect Habitat networks over a gap of up to two hexes; +3 per turn while both remain Pressurized. |
| M | **Spaceport Canteen** | `Trade · Culture` | **On Arrival:** Cargo reaching a connected route awards +6. |
| M | **Education Spire** | `Culture · Signal` | **On Activation:** Every third distinct activated building tag in range 2 awards +4 and an extra card next turn, maximum once/turn. |
| A | **Thermal Commons** | `Heat · Habitat` | **On Cooling:** Removing Hot from a neighboring hex awards +6 and refreshes temporary Pressure duration. |
| A | **Embassy Cluster** | `Habitat · Culture` | **Every 3 turns:** +5 per selected clan represented by neighboring buildings. |
| A | **Arcology Stack** | `Habitat · Pressure` | **Every Turn:** +4 per neighboring Pressurized Habitat, max four; +6 if its network spans Surface and Cavern. |
| A | **Stargazer Memorial** | `Culture · Orbit` | **On Impact:** Safe meteor impact in range 2 awards +8 if no inhabited building was damaged. |
| A | **Eternal City Core** | `Habitat · Culture` | **Every Turn:** If connected buildings from all three active clans triggered, +18; prevent first Integrity loss that era. |

**Signature cascade:** Verdant creates Biomass → Oxygen Orchard pressurizes a district → Hearthline habitats score from new Pressure → Education Spire rewards tag variety → the Eternal City Core pays off three-clan cooperation.

## 10.9 Umbra Institute — Anomaly Researchers

**Theme:** Radiation, exotic resources, spacetime, rule exceptions. **Core tension:** Amplify a combo now at the cost of dangerous long-term contamination.

| Tier | Building | Tags | Trigger and effect |
|---|---|---|---|
| E | **Radiation Siphon** | `Radiation · Power` | **On Radiation:** Radiation appearing next door is removed; +4. |
| E | **Void Prism** | `Crystal · Exotic` | **On Rotation:** In Shadow, one neighboring Crystal counts as an Anomaly source; +3 on the transition to Shadow. |
| E | **Paradox Marker** | `Exotic · Signal` | **On Transform:** Transformation in range 2 gives +3; the next transformation of the same type gives +3 additional. |
| E | **Rift Ward** | `Shield · Exotic` | **On Impact:** Protect neighboring structures from meteor damage but radiate one affected hex; +5. |
| E | **Entropy Probe** | `Exotic · Mining` | **On Excavation:** Reveals a hidden Anomaly in a new Cavern within range 2; +6 if found, +2 otherwise. |
| M | **Temporal Loop** | `Time · Power` | **Every 3 turns:** Reactivate the latest eligible building in range 2, then place Radiation on its hex. |
| M | **Darklight Condenser** | `Cold · Exotic` | **On Rotation:** An adjacent hex becoming Shadowed grants +5 and becomes Cold. |
| M | **Antimatter Trap** | `Exotic · Fuel` | **Every 3 turns:** Consume neighboring Gas/Fuel to make an Anomaly, +10, and radiate its own hex. |
| M | **Probability Lens** | `Crystal · Signal` | **On Draw:** Once every 3 turns, reroll a drawn card into a random eligible card from a selected active clan; +2. |
| M | **Decay Observatory** | `Time · Signal` | **On Destroy:** Save one eligible activation of a destroyed building within range 2 as an Echo next turn; +5. |
| A | **Phase Inverter** | `Time · Heat` | **Every 3 turns:** Invert Hot/Cold on up to three neighboring hexes; +4 per actual change. |
| A | **Uncertainty Gate** | `Exotic · Orbit` | **Passive:** Hexes containing active Anomaly sources count as adjacent for compatible effects; first combo through the Gate each turn +7. |
| A | **Event Horizon Lab** | `Exotic · Radiation` | **Every 3 turns:** +7 per Radiated hex in range 2, max five; four or more Radiated hexes cost 1 Integrity. |
| A | **Causality Engine** | `Time · Automation` | **On Repeat:** Once/turn consume a neighboring Anomaly to grant one building in range 2 an extra activation beyond its normal cap; +8. |
| A | **Zero-Point Beacon** | `Exotic · Power` | **Every 3 turns:** Repeat one eligible building per distinct nearby resource type, max five; +4 per repeat, and radiate the Beacon. |

**Signature cascade:** Shadow generates an Anomaly-like source → Temporal Loop repeats production → Paradox Marker scores repeated transformations → Zero-Point Beacon extends the chain → Radiation Siphons and Radiotrophic Gardens turn the side effect into value.

---

# 11. Colony Archetypes and Cross-Clan Combos

A strong three-clan combination should create an **emergent economic identity**, without requiring a prewritten combo bonus.

| Trio | Colony build | Local trigger chain | Overworld motive |
|---|---|---|---|
| Heliarch + Cryostead + Verdant | **Comet Greenhouse** | Solar melting → Water duplication → Algae Biomass → Pressure and freeze/melt scoring | Claim Ice worlds as CY depots or gardens as GE depots |
| Ironwake + Wreckborn + Synapse | **Infinite Scrapyard** | Mine → Scrap → Forge → Automation repeat → salvaged structures | Establish AL-heavy industrial backbone and cheap rescue routes |
| Heliarch + Kepler + Hearthline | **Solar Trade Empire** | Sunlight → Fuel/Water → Cargo → Docking → cultural trade | Deep-space lanes and CR-rich trade hubs |
| Heliarch + Cryostead + Umbra | **Thermal Paradox** | Invert Heat/Cold → freeze → melt → transform-scoring loops | Dangerous but excellent DA/CY worlds |
| Wreckborn + Verdant + Hearthline | **Reclaimed Paradise** | Demolish → Salvage/Biomass → Pressure → inhabitation | Convert Derelicts to GE and CR centers |
| Ironwake + Cryostead + Hearthline | **Deep Shelter** | Excavate → Stabilize → Pressurize → underground Arcology | Win hazardous caverns and secure rare ice extraction |
| Kepler + Synapse + Umbra | **Entangled Machine** | Orbital bridge → Signal relays → repeats → temporal override | Maximize DA, shortcuts and spatial control |
| Ironwake + Heliarch + Cryostead | **Planetary Forge** | Ore → Metal → Sunlit Alloy + Hot → cooling and Ice conversion | Mine AL while supporting CY routes |
| Verdant + Kepler + Hearthline | **Living Orbital Colony** | Biomass → organic Cargo → docking → habitats score | Specialize in GE exports and trade compacts |

## Fully resolved example: one productive local turn

**Active clans:** Heliarch, Cryostead, Verdant. **Prepared board:** Solar Furnace beside Ice; Vapor Collector and Cryo-Tide Reactor in range; Algae Tank near the resulting Water; Oxygen Orchard adjacent to Biomass production. Algae Tank's timer is ready.

1. Solar Furnace melts one Ice into Water: **+6 Influence**.
2. Vapor Collector detects the Melt and creates another Water on a free hex: **+3**.
3. Cryo-Tide Reactor detects the Ice→Water transformation: **+6**.
4. Algae Tank consumes the first Water and creates Biomass: **+5**.
5. Oxygen Orchard detects adjacent new Biomass and expands Pressure: **+4**.
6. Local gain from this sequence: **+24 Influence**, an extra Water token, one Biomass token and a new Pressure zone, assuming all trigger prerequisites and placement spaces are satisfied.
7. The **Cryogenic Export Depot** charter records progress toward a cryogenic transformation stamp; the Bio integration action may qualify for a secondary GE charter on an Organic-rich world.

The local gain and the overworld export progress are **different rewards**. The player did not simply receive 24 CR for scoring 24 Influence.

---

# 12. World Events, Expeditions, and Frontier Pressure

## 12.1 Local-world event deck

Local events introduce new terrain and combo materials as well as danger. Each world has a visible forecast of its next major event, with rare weather variations.

| Event | Local effect | Strategic opportunity |
|---|---|---|
| Meteor Shower | Adds Ore/Gold/Dust and may damage surface structures | Mining, salvage, cargo launch and impact-scoring |
| Solar Flare | Strong Sunlit triggers and exposed Signal hazard | Power scores, heat capture and Shield cards |
| Cryogenic Night | Environmental Water freezing on exposed Shadow hexes | Reversible Ice/Water engines |
| Derelict Arrival | Wreckage and artificial deposits appear | Salvage chains, recovered cards |
| Core Tremor | New fault lines and Unstable Caverns | Fresh Ore, Anchor value, integrity decisions |
| Organic Comet | Ice plus dormant organisms and Bio-Loam | Immediate ecosystem opportunities |
| Radiation Surge | Anomaly activation and contaminated hexes | Exotic and radiotrophic payoffs |
| Tidal Shift | Shifts Orbital attachment alignment | New adjacency pathways and transport combos |

## 12.2 The expedition clock

The campaign has a visible **Frontier Pressure** track, advancing **one tick per meaningful overworld jump/action**; special crises can add one additional tick. Pressure is *not* tied to real-world time and does not advance during colony turns.

| Pressure band | Overworld change |
|---|---|
| **0–4: Survey Window** | Safe near-home travel and cheap basic route construction |
| **5–9: Trade Friction** | Sector tariffs and route hazard forecasts begin |
| **10–14: Frontier Weather** | Ion storms and deep-space detours become common |
| **15–19: Veil Resonance** | Gate Shrines activate; more exotic worlds, tougher route maintenance |
| **20–23: Closing Window** | Expensive last-minute repairs, mythic weather foreshadowing |
| **24+: Final Warning** | Two meaningful overworld actions to enter an unlocked finale; otherwise expedition ends |

This is a pressure system, not a hidden timer. Players see exactly how much time each optional detour costs. A successful run generally opens the Veil around 15–21 pressure, allowing some strategic buffer. Difficulty modifiers may move thresholds rather than strictly multiplying enemy health.

## 12.3 World contracts and trade-side projects

The player may carry **one sector contract** at a time, choosing among objectives that align with their route:

- **The Auric Census:** Claim a Gold-4+ colony and complete Precious-tagged export stamps → bonus CR and a Foundry reroll.
- **Cryogenic Corridor:** Connect two CY-charter colonies using supplied lanes → remove travel costs for one deep-space hop.
- **The Living Archive:** Complete Bio-Loam growth milestones on two different worlds → GE and a Verdant enhancement discount.
- **Mercantile Accord:** Link three distinct charter types through an operational ring → route capacity bonus.
- **The Salvage Mandate:** Recover a Stranded Site → rare blueprint offer and restored confidence with Wreckborn.
- **Veil Cartography:** Survey two Crystal/Exotic worlds and build a functioning Signal route → DA and a revealed Gate Shrine.

Contracts should encourage unusual route choices and experimentation, not demand collecting 100 generic resources. Abandoned/failed contracts cost opportunity, not an arbitrary reputation grind.

---

# 13. Opening the Veil: How the Expedition Reaches the Finale

The Mythic Crown should be **earned by both exploration and infrastructure**, not just a distance meter.

To enter the finale the player needs:

1. **Three Gate Shards** from distinct Gate-Shrine objectives or qualifying deep-space expedition contracts. At least five shard opportunities should exist per seeded chart; the player can choose their preferred three.
2. A **supplied trade network connected back to the Arkship** with at least **8 total units of demonstrated shipment throughput** across its active lanes in one expedition jump. This can be achieved by building a robust trunk route or alternate branches; no particular clan is mandatory.
3. Enough **Cryo Isotopes** for the final deep-space jump (normally 3 CY, reduced by certain fleet modules).

Once these requirements are met, a **Veil Relay** activates. The player sees previews of three mythic superplanets, including their resource abundance, boss hazard, likely clan strengths, and unique victory conditions, then chooses **one** as the expedition finale. The other two remain unattainable in that run unless an optional post-victory **Endless Frontier** mode is enabled.

At the Veil Relay the player can perform **one complimentary active-clan swap using any previously licensed clan** and make one final Directorate/Foundry purchase. This prevents a surprise map preview from making the chosen trio completely inappropriate, while preserving the cost of earlier strategic commitments.

The connected route network matters during the final colony: it generates limited **Expedition Supply Tokens**, a preparation-style benefit, rather than dumping the entire world economy onto the boss board.

### Supply Token conversion (finale only)

Before landing, spend up to **three tokens** on a 1-for-1 basis by paying one of the following sealed cargo bundles:

- `3 AL` → **Reinforced Landing:** a free Anchor and +1 starting Integrity.
- `3 CY` → **Thermal Reserve:** first Heat/Cold global hazard is reduced for one turn.
- `3 GE` → **Bio Containment:** place one protected Bio-Loam patch or shield an opening habitat zone.
- `3 DA` → **Predictive Array:** forecast the first two boss phase hazards and reveal hidden deposits in the landing sector.
- `5 CR` → **Trade Charter:** gain a one-time bonus card offer on turns 1, 5, and 10, subject to active-clan eligibility.

The fleet can carry **only three total tokens**, so building an economically diverse empire offers options rather than an unconditional pile of buffs.

---

# 14. The Mythic Superplanets — Environmental Boss Maps

A mythical planet must feel like the opposite of a normal starter asteroid: **almost absurdly rich**, but so active and hostile that unplanned extraction can destroy the colony. These are giant *city-builder puzzles*, not tactical combat levels.

Each final planet has three distinct linked **regions** (for example, a Surface plateau, a deep underworld, and a storm-side district) plus a limited Orbital layer. During early phases, only the starting region is safe to build in. By completing stabilization objectives the player opens the others. This provides increased scale without overwhelming the board at turn 1.

Boss victory requires all three core conditions: **(A) survive the final hazard cycle, (B) meet the final Influence target, and (C) satisfy the planet's signature stabilization objective**. Optional fourth objectives grant prestige score, ending variants, or permanent unlocks.

## 14.1 AURELIA PRIME — The Golden Maw

**Fantasy:** A legendary metal world whose deserts glitter with raw gold and whose mantle pulses with molten auric rivers. Every crater contains wealth. Mining it causes the planet to move.

**Resource profile:** Gold 5, Metal 5, Ice 1, Bio-Loam 0, Exotic 3.  
**Map-specific tags:** `Auric`, `Fault Stress`, `Molten`, `Magnetic Surge`.  
**Local richness:** Large Gold Vein clusters, iron canyons, valuable crystalline faults, pre-excavated industrial chambers.

**Boss system: Planetary Fault Stress**

- Every Gold Vein extraction increases a visible **Fault Stress meter** by one.
- At Stress 3, nearby Unstable hexes split or shift; at Stress 6, a major **Mantle Roar** damages unanchored districts and exposes additional Gold Veins.
- Gravity Anchors, Core Lattice, and selected clan-neutral stabilization milestones reduce Stress. Redirected meteors or deep mining can spike it.
- Players can **intentionally trigger** a Mantle Roar on a cleared industrial hex to unearth large reserves, turning the catastrophe into an economic play.

**Three boss phases**

1. **Glittering Landing (turns 1–10):** Abundant safe ore; mark and stabilize two fault sectors.
2. **The Hungry Mantle (turns 11–20):** Fault Stress rises faster; new gold seams surface; magnetic surges periodically interrupt Signal/Power links.
3. **The Auric Heart (turns 21–34):** Three fault sectors must be linked and stabilized before final eruption; final Influence threshold is high but raw metal is nearly unlimited.

**Signature stabilization win condition:** Maintain **three Stable fault anchors in different regions** across two consecutive hazard resolutions while successfully processing or utilizing six `Precious`-tagged deposits. The player can solve this with Anchors, shielded Habitats, orbital rerouting or exotic spacetime effects—not only with Ironwake.

**Best natural trios:** Ironwake + Heliarch + Kepler; Ironwake + Wreckborn + Synapse; Umbra + Hearthline + Ironwake.

**Victory fantasy:** The player turns a predatory golden mantle into a controlled planet-sized foundry. The ending reveals an unthinkably wealthy capital at the trade network's far edge.

## 14.2 NYXEA — The Ocean Under Night

**Fantasy:** A cold superplanet whose immense oceans are sealed beneath translucent ice. Its dark hemisphere contains enough water and fuel to supply civilizations for centuries—but pressure fractures and cryogenic storms constantly remake the map.

**Resource profile:** Gold 0, Metal 2, Ice 5, Bio-Loam 3, Exotic 2.  
**Map-specific tags:** `Deep Ice`, `Crack`, `Brine Vent`, `Pressure Surge`.  
**Local richness:** Huge Ice formations, sealed subsurface water reservoirs, volatile gas fountains, protected microbial fields.

**Boss system: The Fracture Tide**

- A visible **Tidal Pressure meter** rises when Ice is melted or water is moved across certain cracks.
- Periodically, the tide floods vulnerable hexes (temporarily making them Water) and collapses unsheltered cavern corridors.
- The player can build Pressure networks, chill water back into structural ice, reroute Cargo around floods, and use biological growth to stabilize selected cavities.
- Frozen tiles are both obstacles **and** vital construction supports. Melting every Ice deposit is a losing strategy.

**Three boss phases**

1. **Frozen Beachhead (turns 1–10):** Establish heating/cooling balance and open one subsurface region.
2. **The Black Tide (turns 11–20):** Flood pulses alternate with Deep Night; inhabited districts need shelter while ice transforms rapidly.
3. **The Great Thaw (turns 21–34):** Massive resource opportunity as the ocean opens; stabilize an underwater power/habitat loop before the final tidal surge.

**Signature stabilization win condition:** Maintain **four linked Pressure-supporting structures** in two regions, keep at least **three Deep Ice support hexes** unbroken, and complete eight distinct Ice/Water transformation events.

**Best natural trios:** Cryostead + Verdant + Hearthline; Heliarch + Cryostead + Kepler; Cryostead + Umbra + Synapse.

**Victory fantasy:** An illuminated human and alien city beneath living oceans, supplying the frontier from an inexhaustible-looking but carefully balanced cryosphere.

## 14.3 VIRIDION SOVEREIGN — The Sleeping Garden

**Fantasy:** A mythical jungle planet with giant dormant biotech networks and soils packed with alien life. It appears hospitable at first, then starts growing over the player's machinery.

**Resource profile:** Gold 1, Metal 1, Ice 3, Bio-Loam 5, Exotic 4.  
**Map-specific tags:** `Wild Growth`, `Spore Fever`, `Symbiosis`, `Quarantine`.  
**Local richness:** Large Bio-Loam beds, thick Organic Seam clusters, ancient bio-machinery, fungal caverns, xenocrystals.

**Boss system: Planetary Bloom**

- Every few turns, uncontrolled **Wild Growth** spreads into open Bio-Loam and empty Pressure-rich hexes.
- Wild Growth is not an enemy unit to fight; it is a living terrain state that can obstruct construction, consume resources, and transmit growth triggers.
- The player can harvest, domesticate, quarantine or deliberately cultivate this growth.
- **Symbiosis meter:** Cleverly routing Wild Growth through Bio and Habitat structures converts it into **Tamed Growth**, an asset for scoring and stabilization; burning it all down gives short-term space but destabilizes the ecosystem.

**Three boss phases**

1. **The Gentle Welcome (turns 1–10):** Nearly effortless biological growth, but early quarantine districts must be mapped.
2. **The Dreaming Bloom (turns 11–20):** Wild Growth overruns unprepared industrial districts; radiation-reactive life appears in dark sectors.
3. **The Planet Awakens (turns 21–34):** Massive spreading growth wave; domesticated root networks can convert it into a spectacular combo cascade.

**Signature stabilization win condition:** Create **six Tamed Growth zones**, maintain **three functioning Quarantine boundaries**, and trigger a connected ecosystem involving at least **two different clans** during the final bloom.

**Best natural trios:** Verdant + Hearthline + Cryostead; Verdant + Synapse + Umbra; Wreckborn + Verdant + Kepler.

**Victory fantasy:** A planet and a civilization enter a stable symbiosis; the colony becomes a living world-machine instead of a conventional city.

## 14.4 General boss fairness rules

- The player previews the **planet's exact hazard rule**, resource profile, and stabilization objective before committing.
- Hazard meters and map-region opening milestones are visible at all times.
- Every boss has at least **three mechanically different** viable stabilization approaches using neutral structures, map features or clan cards. A particular clan makes a solution stronger but is never compulsory.
- Resource abundance provides real combo opportunities; difficulty arises from volatility, spatial tradeoffs, and competing objectives.
- The final phase includes a **warning window** of at least two turns before the largest hazard.
- Winning before or after a boss's extreme weather is an interesting strategic choice, not a hidden scripted punishment.

## 14.5 Endings and replayability

Each boss offers three broad ending qualities:

- **Survival Claim:** The player meets mandatory conditions and saves the expedition.
- **Resonant Capital:** The player also completes optional Masterwork objectives and ends with a functioning high-throughput supply line back to the Arkship.
- **Transcendent Civilization:** The player ends with active contributions from all three current clans, a planetary mega-project, and exceptional multi-region combo performance.

Completing one mythical world ends the standard expedition. The game can show the alternate superplanets that were *not* claimed, prompting a future expedition with different clans and geography. Optional Endless Frontier permits further colonization after victory without changing the primary win condition.

---

# 15. Mega-Projects and Colony-Wide Technologies

Mega-Projects are **recognized arrangements**, not standalone cards purchased with a giant stack of local materials. They reward a constellation of tagged structures and work especially well on late planets.

| Mega-project | Spatial/tag requirement | Reward |
|---|---|---|
| **Artificial Dawn** | 3 connected Solar and 2 Power buildings | Solar network functions for one extra Shadow phase |
| **Deep Biosphere** | 4 connected Bio structures in Stable, Pressurized Caverns | Recurring Influence and extended Pressure |
| **Orbital Trade Ring** | 3 Orbital structures and a functional Cargo cycle | Every third delivery repeats a Trade scoring event |
| **Planetary Processor** | 3 connected Mining/Industry structures with two Alloy producers | Every third Metal transformation makes spare Alloy on legal space |
| **Civilization Nexus** | Two connected, Pressurized buildings from each of the three active clans | A living council: +1 per seat each turn (lost when a seated building goes), and first disaster protection per era |
| **Exotic Reactor** | 3 Exotic buildings bordering an Anomaly source | Extra activations with controllable Radiation risk |

**Local technologies / artifacts** are different from the overworld's persistent Clan Enhancements. These are gained *inside one colony* at Influence checkpoints, then vanish when that map ends. Example upgrades: +1 range, temporary extra Charge, +1 tag, thermal immunity, an additional mobile platform, and once-per-era activation echo. They should reinforce the engine that emerged from the actual map, rather than replacing it.

---

# 16. Example Expedition: A Network Worth Building

This walkthrough illustrates the intended emotional and economic arc. Numbers are illustrative and assume purchases/production conditions are met.

### Expedition start

- Starting trio: **Ironwake + Cryostead + Hearthline**.
- Starting fleet purse: **6 CR, 4 AL, 5 CY, 2 DA, 0 GE, 0 GS**.
- Star map exposes three nearby candidates: a short-hop Gold-4 world, a short-hop Ice-5 world, and a low-yield Relay Rock.
- Player chooses Gold-4 **Aurum's Wake** rather than the Relay Rock because they want an early industrial economy.

### Colony 1 — Aurum's Wake

- The player exploits Ore and Gold Veins with Prospector Nail/Pit Drill, connects the district to a Pressure Dome, and clears an Influence checkpoint.
- They specialize as a **Minting Outpost**, receiving a large CR Claim Shipment and a smaller AL shipment.
- They spend **2 AL + 1 CR** to build a Short Relay back to the Arkship. Its trade output now arrives on subsequent qualifying jumps until the colony's production charges run out.

### Colony 2 — Nacre-9

- Nacre-9's Ice-5 profile is excellent for Cryostead and scarce fuel production, so the player goes there next.
- The Frost Trap/Vapor Collector interaction creates the local scoring engine. The chosen **Cryogenic Export Depot** charter pays CY, and the colony joins the supplied route.
- With a dependable fuel source, the player can now afford to explore farther rather than staying on the safest nearby branch.

### First overworld spending choice

The player has enough CR and DA to choose **one** of the following:

1. **Favor Frost Trap** and raise its future draw probability.
2. **Raise Cryostead Presence** so more future cards are Cryostead cards.
3. **Save for Deep Prospect Scan** to get better information on the next resource-rich asteroid.

They pick **Raise Cryostead Presence** (`1→2`). Future draws now select Ironwake/Cryostead/Hearthline at theoretical weights `1/2/1`. This does not guarantee Frost Trap, and it does not change what already happened on Aurum's Wake.

### Colony 3 — Kepler Enclave

- The player finds the **Kepler Cartographers** enclave at a long, potentially lucrative trade junction.
- On this specific colony they bench Hearthline, forming **Ironwake + Cryostead + Kepler**. The enclave provides a loaner Tether Node and visible orbital dock.
- They complete a Cargo/Orbit objective. Kepler becomes **licensed** for all future Freeport lineup swaps. Hearthline automatically returns after the map.
- Later they pay to replace Ironwake with Kepler for a region focused on long-range routes and ice shipping. Their investments in Ironwake are not deleted.

### Mid-expedition: a strategic ring

- The player colonizes **Morrow Husk**, a Bio-Loam-5 world, and contacts Verdant in another enclave.
- They build a three-node trade ring between Nacre-9, the Kepler orbital station, and Morrow Husk. Its alternate path protects exports when a micrometeor swarm disrupts the shortest lane.
- The ring's **Cryo Logistics** compact reduces a later long-hop cost. Gene Archives from Morrow Husk buy a Gene Seed Vault for the next colony, making a future Ice/Bio run easier to start.

### The Veilward choice

By the late game the player has:

- A diversified CR/AL/CY/GE/DA network.
- Three Gate Shards obtained via two shrine maps and one deep-space research contract.
- An eight-unit supplied throughput line back to the Arkship.
- Four licensed clans and the ability to swap a clan before the finale.

They survey the three mythic planets and select **Nyxea** because their expedition already has a strong Cryostead ecosystem and good CY supply. At the Veil Relay they configure **Cryostead + Verdant + Hearthline** and pay for a **Thermal Reserve** and **Bio Containment** supply token.

### Final colony — Nyxea

At first the colony seems lavishly rich in Ice. Midway through, the Fracture Tide begins destroying exposed corridors. The player deliberately preserves three supporting ice structures, establishes Pressurized underground Habitats, and lets Cryostead convert excess Water into Ice in a second district. A Verdant/Hearthline system takes advantage of those changes to produce enough Influence to meet the final threshold.

**The expedition succeeds because of both halves:** the player designed good local spatial combos, and they chose/supplied/connected the worlds that let the chosen strategy arrive prepared.

---

# 17. Readability and Player Interface

## 17.1 Star-map view

Each world node should communicate its strategic identity in a compact and legible way:

**World card preview**

- World name and seed
- `Gold / Metal / Ice / Bio / Exotic` abundance ratings, shown as five small pip bars
- Known hazards and one special local rule
- Clan enclave badge, if applicable
- Claim Shipment estimate and available charter families
- Route build cost, travel CY cost, lane capacity, and current network status
- A clear indication of `Unsurveyed`, `Surveyed`, `Unclaimed`, `Claimed`, `Connected`, `Stranded`, or `Disrupted`

**Overworld tabs**

- **Chart:** Nodes, built links, route traffic and projected travel cost.
- **Economy:** World resources, production charges, shipment forecast and route bottlenecks.
- **Directorate:** Three active clan slots, licensed bench, clan weights, per-card bans and favors.
- **Foundry:** Purchasable blueprints with direct indication of clan eligibility.
- **Fleet:** Equipment, two/three Preparation Slots, and expedition supply.
- **Objectives:** Contracts, Gate Shards, Frontier Pressure and visible boss-entry checklist.

When hovering over a colony's export, the game should highlight the route to the Arkship and visibly show where shipment capacity is lost. The player should never wonder why a world with 3 CY production only delivered 1 CY.

## 17.2 Colony-map view

- **Colored resource/tag icons** rather than walls of text.
- **Combo forecast on placement:** Before placing a card, show the expected immediate events, estimated Influence and affected hexes. Do not reveal hidden RNG or distant later turns as certainty.
- **Event log grouped by chain:** `Solar Furnace → Ice melts → Vapor Collector → Algae Tank → Oxygen Orchard`, with total Influence at the end.
- **Lighting preview:** Display at least the next two Sunlit/Shadow phases.
- **Hover chains:** A building panel shows what activated it and which nearby buildings it could activate.
- **Network overlay filters:** Power, Signal, Pressure, Bio roots, Mining tunnels and Orbital paths.
- **Charter panel:** Three progress stamps, expected world Shipment, and what must happen to earn a better charter.
- **Active-clan tabs:** Three visible icons, per-clan deck weights, bans and favored cards carried over from the overworld.

The screen should make it delightful to watch an enormous cascade, but also explain *why* it happened. Resource transformations require clear physical animation: ice liquefies, metal is forged, biomass sprouts, cargo launches, and a temporary Signal path lights up.

---

# 18. Balance Guardrails and Open Questions

## 18.1 Non-negotiable balance guardrails

1. **Every clan must work alone at a basic level.** At least one viable scoring loop exists within its first five cards plus the map's guaranteed resources.
2. **All nine clans interact through shared tags.** Do not invent unique clan-specific versions of ordinary Ice, Metal or Cargo unless the distinction is strategically meaningful.
3. **The best worlds have a downside.** Abundance increases explosive combo potential but may bring hazards, distance, poor route position or awkward charter requirements.
4. **Make build order matter, not just list composition.** Two identical decks on different hex maps should result in different cities.
5. **World resources create decisions rather than replace placement.** A fleet purchase grants starts, options, protection or bias. It should rarely award free Influence with no local play.
6. **Clamp runaway economic loops.** Production charges, finite node visits, Pressure progression, route capacity and limited Preparations constrain the macro economy.
7. **Clamp local infinite loops.** Two activations per building per turn; rare exceptions are explicit and costly.
8. **Draw manipulation has understandable math.** Show both clan weight and individual card weight; state bans and eligibility clearly.
9. **No compulsory clan for a boss.** A boss may favor certain systems, but alternate paths must be designed and tested.
10. **Prevent irreversible route softlocks.** Emergency fuel at high exchange cost, a return projection, and at least one recoverable connected route exist before long jumps.
11. **Resource value is not the same as map value.** A Gold-5 world should not always be the mathematically obvious choice versus a strategic Ice-3 Relay Rock.
12. **The player must be able to finish.** Baseline expedition length, travel fuel income, Shard placement and final-supply requirements are generated together to ensure possible completion.

## 18.2 Risks to test early

| Risk | Symptom | First intervention |
|---|---|---|
| Overworld turns into busywork | Repeated route maintenance feels like chores | Remove per-jump manual servicing; use forecastable infrequent crises |
| Card bans trivialize the deck | Players ban all but their two best cards | Global/per-clan caps, tier constraints and real cost |
| One clan dominates scores | Synapse/Umbra repeats overwhelm simpler clans | Strict caps and smaller baseline Influence on repeat cards |
| Markets erase geography | Everyone buys the same CY at Freeports | High exchange friction, limited merchant stock, charter niches |
| No route identity | Players connect each colony straight back to base | Bottlenecks, lane discounts, trade rings and node-specific perks |
| Boss is just an oversized map | End feels slow rather than climactic | Three explicit environmental phases and multi-region stabilization puzzle |
| World resource payout is opaque | Player doesn't know why they earned 7 AL | Charter Stamp recap and exact shipment formula |
| Enclave worlds punish chosen clan trio | Swap feels forced and strategically bad | Choice of benched clan, supplied starter card, attractive permanent license |
| Local map too crowded | 135 cards introduce excessive cognitive load | Stagger tiers; concise shared tags; build compendium and hover references |
| Stars become a linear checklist | There is one economically correct route every run | Different seed supply, alternate Gate Shrines, diverse charter opportunities |

## 18.3 Key numerical questions for playtesting

- Do 1–3 cards per turn and a hand of five offer enough agency without excessive analysis paralysis?
- Does the 16–22 turn colony length allow a three-clan identity to emerge before the run ends?
- Does `1–3 goods per jump × four charges` create enough overworld income to meaningfully afford a few edits, but not every edit?
- Does the Pressure track at `24` allow around 8–12 claims and some detours without punishing exploratory play too harshly?
- Are three Shards and eight throughput a motivating final objective rather than a repetitive tax?
- Is temporary enclave substitution exciting when it interrupts a well-tuned trio?
- Are all 9×8 = 72 ordered clan pairs (and 84 unordered trios) represented by at least a few strong interactions?
- Which Foundry offers most often become uninteresting because they add a card and reduce consistency? Prices or initial Favor can compensate.

---

# 19. Content Scope and Practical Design Phases

The game should be evaluated through systems-first prototypes. These are **content milestones**, not technical implementation requirements.

### Phase 1: Prove the local spatial puzzle

- Four clans: **Ironwake, Heliarch, Cryostead, Verdant**.
- Their first five buildings (20 cards), one asteroid type, Surface/Cavern zones, Ore/Gold/Ice/Water/Bio-Loam/Biomass.
- Four-phase light rotation, resource transformations, basic Influence, and two-activation cap.
- Goal: a five-building chain should feel discoverable, satisfying, and understandable.

### Phase 2: Prove that the overworld matters

- One small star sector, 6–8 node choices, 4 different resource profiles and two hazards.
- First four world currencies (CR, AL, CY, GE), claim shipments, active routes, finite production charges.
- Clan Presence, one card ban, one card Favor, a few one-shot Preparations.
- Goal: two equally viable worlds should lead to genuinely different next-colony situations.

### Phase 3: Prove clan swapping and expansion

- Add Kepler and Hearthline; one Enclave world with temporary roster swap.
- Add DA, orbital map zone, long routes, a trade ring bonus, and five Foundry cards.
- Goal: choosing/benching a clan and investing in a card pool should change the gameplay, not merely the menu.

### Phase 4: Complete one expedition arc

- Add Wreckborn, Synapse and Umbra; expand to all nine clans and 135 base cards.
- Four sectors, Gate Shards, Frontier Pressure, full trade economy and at least one prototype boss planet.
- Goal: local skill and strategic planning should both be necessary to reach and beat the boss.

### Phase 5: Full release content and variety

- All three mythic superplanets, 18 Foundry cards, route crises, varied charters, contracts, artifacts, unusual asteroid archetypes, additional endings and challenge modes.
- Goal: successive expeditions with different trios should feel like different interstellar civilizations.

---

# 20. Final Design Thesis

**ASTRAL EXPANSE** should make the player feel like the architect of a network of peculiar, specialized civilizations.

A Gold-rich asteroid can become a Mint, a floating factory or a scientific observatory depending on the buildings and clans used to colonize it. An Ice-rich moon can become a fuel depot, a greenhouse or a cryogenic research station. A Bio-Loam world can become a peaceful Garden, an orbital export hub or an unstable living machine.

On the colony map, the joy comes from **placing one card in exactly the right hex and watching many other cards respond**. On the star map, the joy comes from **realizing that the last three colonies now form a trade machine** that can finance a new clan, favor a crucial card, supply the next map, and reach a distant unexplored sector.

The final mythical planets complete this promise: an overwhelming natural resource bonanza made dangerous by the physical systems around it. Winning means not simply harvesting the richest world, but creating the most capable connected civilization.

> **Local puzzle:** Where should this building go?  
> **Overworld puzzle:** Which world should we colonize, connect, and invest in next?  
> **Expedition goal:** Can this particular three-clan civilization make it all the way to the mythical worlds?

---

## Quick Reference: Counts and Terms

| Item | Initial full design |
|---|---:|
| Core clans | **9** |
| Active clans on any ordinary colony | **3** |
| Clan Enclave substitution | **1 guest replaces 1 active clan for that colony** |
| Base buildings per clan | **15** |
| Base building pool | **135** |
| Optional Foundry blueprints | **18** (2 per clan in this concept) |
| Full proposed catalog | **153** buildings |
| Possible unordered three-clan selections | **84** |
| Local building plays | Normally **1 per turn** |
| Draws per turn | **1–3** based on previous-turn clan participation |
| Local asteroid layers | **Surface, Caverns, Orbit** |
| Main world spendable resources | **5** (CR, AL, CY, GE, DA) |
| World progression resource | **Gate Shards (GS)** |
| Regular expedition regions | **4** |
| Mythic boss planet options | **3** |
| Boss planet needed to win | **1** |
| Gate unlock requirement | **3 GS + 8 supplied throughput + enough CY** |

**This document is a design blueprint, not a final balanced ruleset.** Early testing should focus on emergent tag interactions, route-driven decision-making, and whether card-pool edits feel worth their world-resource cost.
