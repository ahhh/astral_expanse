// Local (colony-map) resources. `dep` marks natural deposits; the rest are
// loose tokens created by buildings. Filters in card code use '#Tag' for a
// tag and a bare name for an exact resource type.
export const RES = {
  Ore: { n: 'Iron-Nickel Ore', tags: ['Ore', 'Metal', 'Mineral'], dep: 1, ic: '🪨' },
  Gold: { n: 'Gold Vein', tags: ['Ore', 'Metal', 'Mineral', 'Precious'], dep: 1, ic: '🪙' },
  Ice: { n: 'Cryo-Ice', tags: ['Ice', 'Cold', 'Volatile'], dep: 1, ic: '🧊' },
  Gas: { n: 'Volatile Gas', tags: ['Gas', 'Fuel', 'Volatile'], dep: 1, ic: '💨' },
  Crystal: { n: 'Photonic Crystal', tags: ['Crystal', 'Mineral', 'Light'], dep: 1, ic: '💎' },
  Loam: { n: 'Bio-Loam', tags: ['Organic', 'Bio', 'Soil'], dep: 1, ic: '🟫' },
  Seam: { n: 'Organic Seam', tags: ['Organic', 'Bio', 'Dormant'], dep: 1, ic: '🍂' },
  Wreck: { n: 'Ancient Wreckage', tags: ['Wreck', 'Scrap', 'Artificial'], dep: 1, ic: '🛰️' },
  Anomaly: { n: 'Exotic Anomaly', tags: ['Anomaly', 'Exotic', 'Radiation'], dep: 1, ic: '🌀' },
  Regolith: { n: 'Regolith', tags: ['Dust', 'Mineral'], dep: 1, ic: '🏜️' },
  Growth: { n: 'Wild Growth', tags: ['Bio', 'Wild'], dep: 1, ic: '🌱' },
  Metal: { n: 'Metal', tags: ['Metal'], ic: '🔩' },
  Scrap: { n: 'Scrap', tags: ['Scrap', 'Metal'], ic: '⚙️' },
  Alloy: { n: 'Alloy', tags: ['Alloy', 'Metal'], ic: '🔷' },
  Water: { n: 'Water', tags: ['Water'], ic: '💧' },
  Biomass: { n: 'Biomass', tags: ['Bio', 'Organic'], ic: '🌿' },
  Fuel: { n: 'Fuel', tags: ['Fuel', 'Volatile'], ic: '⛽' },
  Cargo: { n: 'Cargo', tags: ['Cargo'], ic: '📦' },
  Dust: { n: 'Dust', tags: ['Dust'], ic: '🌫️' },
};

export function resIs(type, sel) {
  if (!type) return false;
  if (typeof sel === 'function') return sel(type);
  if (Array.isArray(sel)) return sel.some((s) => resIs(type, s));
  if (sel[0] === '#') return RES[type].tags.includes(sel.slice(1));
  return type === sel;
}

export const STATUS = {
  Hot: { ic: '🔥', d: 'Heated. Cooling it triggers On Cooling effects.' },
  Cold: { ic: '❄️', d: 'Chilled. Hot and Cold replace each other.' },
  Pressure: { ic: '🫧', d: 'Pressurized. Habitats here count as Pressurized.' },
  Radiation: { ic: '☢️', d: 'Radiated. Habitat buildings here cannot activate.' },
  Unstable: { ic: '⚠️', d: 'Unstable. Buildings here are destroyed by tremors.' },
  Stable: { ic: '⚓', d: 'Stable. Protected from tremors and fault damage.' },
  Shielded: { ic: '🛡️', d: 'Shielded. Immune to impacts and tremors.' },
  Shade: { ic: '🌑', d: 'Permanent Shadow.' },
  Crack: { ic: '〰️', d: 'Ice crack. Floods destroy unpressurized buildings next to cracks.' },
};

export const FAMILIES = ['gold', 'metal', 'ice', 'bio', 'exotic'];
export const FAMILY_INFO = {
  gold: { n: 'Gold', ic: '🪙' },
  metal: { n: 'Metal', ic: '🪨' },
  ice: { n: 'Ice', ic: '🧊' },
  bio: { n: 'Bio-Loam', ic: '🟫' },
  exotic: { n: 'Exotic', ic: '💎' },
};

// World (overworld-only) resources.
export const WORLD = {
  CR: { n: 'Coalition Credits', ic: '💳' },
  AL: { n: 'Fleet Alloys', ic: '🧱' },
  CY: { n: 'Cryo Isotopes', ic: '🧪' },
  GE: { n: 'Gene Archives', ic: '🧬' },
  DA: { n: 'Star Data', ic: '📡' },
  GS: { n: 'Gate Shards', ic: '🔺' },
};
