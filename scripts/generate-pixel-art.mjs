// Generates the pixel-art SVG sprites in src/assets/art/.
// Run: node scripts/generate-pixel-art.mjs
// Sprites referenced as "<shape>-<tint>" in src/assets/art/index.ts are emitted automatically.
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";

const OUT = new URL("../src/assets/art/", import.meta.url);

// Shared limited palette.
const FIXED = {
  o: "#141821", k: "#3a4252", s: "#6b7a8f", l: "#b4c2d3", w: "#eef3f8",
  y: "#f5b83d", r: "#e0602f", g: "#4cc38a", u: "#37c6de",
};
// Material tints: [main (a), shade (b), highlight (c)].
const TINTS = {
  amber: ["#f5b83d", "#b57f1c", "#ffe19a"], coal: ["#4a505c", "#2b2f38", "#7a818e"],
  iron: ["#a8603f", "#6e3a28", "#d89468"], copper: ["#d9803a", "#9c5424", "#f5b47a"],
  bauxite: ["#c96f44", "#8e4526", "#eaa47c"], silica: ["#c4e6ee", "#86b3c2", "#f1fbff"],
  oil: ["#4a4254", "#29232f", "#7d7090"], water: ["#3fa6e8", "#2870b2", "#a2d9fb"],
  lime: ["#dbd3b8", "#a79f84", "#f5f0dd"], titanium: ["#8ea4bb", "#5a6d83", "#cad8e6"],
  uranium: ["#8fe04e", "#4b9a2c", "#d0f7a0"], gas: ["#9ed3e2", "#5f99ab", "#e2f6fb"],
  lithium: ["#d98bd8", "#9b4f9b", "#f5c8f3"], gold: ["#f0c53a", "#b58a1e", "#fff0a0"],
  silver: ["#c3ccd8", "#8791a0", "#f1f5fa"], sulfur: ["#e8d94c", "#a99c25", "#fff7a0"],
  rare: ["#6fbfae", "#3e8274", "#b0eadc"], bio: ["#72b34c", "#41792b", "#acdd87"],
  sand: ["#e3c58b", "#b0935a", "#f7e5bd"], tungsten: ["#6e7282", "#454957", "#a2a7b6"],
  steel: ["#8c99ab", "#5b6778", "#c6d1de"], alu: ["#b8c7d6", "#7d8ea3", "#e6eef6"],
  fuel: ["#e89a3a", "#a8641d", "#ffd08a"], cyan: ["#37c6de", "#1f8aa0", "#a6ecf7"],
  plastic: ["#4fb8a4", "#2f7d6f", "#98e3d3"], circuit: ["#3fa864", "#27703f", "#8fe0a8"],
  concrete: ["#a7a39a", "#74716b", "#d2cfc7"], rubber: ["#3c3c46", "#232329", "#6a6a78"],
  red: ["#e05a3a", "#9c3520", "#ff9f86"], purple: ["#9a6cf0", "#5f3eb0", "#d4bcff"],
  wood: ["#b9814a", "#7f5430", "#e0ac74"], brick: ["#b5553a", "#7c3524", "#dc8a6a"],
  earth: ["#8a6a4a", "#5c4430", "#b8946c"],
};

// 16x16 grids. '.' = transparent, a/b/c = tint, other letters = FIXED palette.
// Adds a 1px dark outline around every painted pixel.
function outlined(rows) {
  const g = Array.from({ length: 16 }, (_, y) => (rows[y] ?? "").padEnd(16, ".").split(""));
  const out = g.map((r) => [...r]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (g[y][x] !== ".") continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== ".")) out[y][x] = "o";
  }
  return out.map((r) => r.join(""));
}

const SHAPES = {
  ore: ["", "", "", "......oooo", "....ooccaaoo", "...occaaaaaao", "..ocaaacaabbao", "..oaaaaaaabbao", ".ocaabaaaaaaabo", ".oaabbaaacaabbo", ".oaaaaaaaaabbbo", ".obaaacaabbbbo", "..obbbbbbbbbo", "...ooooooooo"],
  ingot: ["", "", "", "", "", "....oooooooo", "...occcccccco", "..ocaaaaaaaabo", ".ocawaaaaaaaabo", ".oaaaaaaaaaaabo", ".obbbbbbbbbbbbo", "..oooooooooooo"],
  drop: ["", ".......oo", "......ocao", "......ocao", ".....ocaaao", ".....ocaaao", "....ocaaaaao", "...occaaaaaao", "...owaaaaaabo", "..occaaaaaaabo", "..ocaaaaaaaabo", "..oaaaaaaaaabo", "..obaaaaaaabbo", "...obbbbbbbbo", "....oooooooo"],
  canister: ["", "......oooo", "......okko", ".....oooooo", "....occaaabo", "...ocaaaaaabo", "...owaaaaaabo", "...ocaaaaaabo", "...ollllllllo", "...ocaaaaaabo", "...ocaaaaaabo", "...ocaaaaaabo", "...ocaaaaaabo", "...obbbbbbbbo", "....oooooooo"],
  bolt: ["", ".........ooo", "........occo", ".......ocao", "......ocao", ".....ocao", "....ocaaoooo", "...ocaaaaaao", "...ooooaaao", "......oaao", ".....oaao", "....oabo", "....obo", "....oo"],
  crystal: ["", ".......oo", "......ocao", ".....occabo", "....occaabbo", "...occaaabbbo", "...ocaaaabbbo", "...owaaaabbbo", "...ocaaaabbbo", "...ocaaaabbbo", "...ocaaaabbbo", "...obaaaabbbo", "....obaaabbo", ".....obaabo", "......obbo", ".......oo"],
  pile: ["", "", "", "", "", "", "", ".......oo", "......ocao", ".....ocaaao", "....occaaabo", "...ocaaaaaabo", "..ocaacaaaabbo", ".ocaaaaaaacabbo", ".obbbbbbbbbbbbo", "..oooooooooooo"],
  plate: ["", "", "", "..oooooooooooo", "..occcccccccco", "..ocoaaaaaaobo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..ocoaaaaaaobo", "..obbbbbbbbbbo", "..oooooooooooo"],
  beam: ["", "", "..oooooooooooo", "..occcccccccbo", "..obbbbbbbbbbo", "..oooooaaooooo", "......oabo", "......oabo", "......oabo", "......oabo", "......oabo", "......oabo", "..oooooaaooooo", "..occcccccccbo", "..obbbbbbbbbbo", "..oooooooooooo"],
  coil: ["", "", "..oooooooooooo", "..osssssssssko", "..oooooooooooo", "...ocaaaaaaao", "...obbbbbbbbo", "...ocaaaaaaao", "...obbbbbbbbo", "...ocaaaaaaao", "...obbbbbbbbo", "...ocaaaaaaao", "..oooooooooooo", "..osssssssssko", "..oooooooooooo"],
  chip: ["", "", "....l.l..l.l", "....l.l..l.l", "...oooooooooo", ".llokkkkkkkkoll", "...okkkkkkkko", ".llokkaaaakkoll", "...okkaccakko", ".llokkabbakkoll", "...okkkkkkkko", ".llokkkkkkkkoll", "...oooooooooo", "....l.l..l.l", "....l.l..l.l"],
  battery: ["", "......oooo", "......olso", "....oooooooo", "....olssssko", "....oooooooo", "....ocaaaabo", "....ocawaabo", "....ocwwwabo", "....ocawaabo", "....ocaaaabo", "....ocaaaabo", "....oooooooo", "....olssssko", "....oooooooo"],
  rods: ["", "..oooooooooooo", "..olllllllllko", "..oooooooooooo", "..ocaoocaoocao", "..ocaoocaoocao", "..owaoowaoowao", "..ocaoocaoocao", "..ocaoocaoocao", "..ocaoocaoocao", "..ocaoocaoocao", "..obaoobaoobao", "..oooooooooooo", "..olllllllllko", "..oooooooooooo"],
  crate: ["", "", "", "..oooooooooooo", "..obbbbbbbbbbo", "..obcaaaaaaabo", "..obacaaaaaabo", "..obaacaaaaabo", "..obaaacaaaabo", "..obaaaacaaabo", "..obaaaaacaabo", "..obaaaaaacabo", "..obaaaaaaacbo", "..obbbbbbbbbbo", "..oooooooooooo"],
  rocket: [".......oo", "......oaao", ".....oaaabo", ".....oooooo", ".....olssko", ".....olssko", ".....oluuko", ".....olssko", "....oolsskoo", "...oaolsskoao", "...oaolsskoao", "...oooooooooo", ".....oryyro", "......ryyr", ".......rr"],
  phone: ["", "....oooooooo", "....oaakkaao", "....olluuuuo", "....oluuuuuo", "....ouuuuuuo", "....ouuuuuuo", "....ouuuuuuo", "....ouuuuuuo", "....ouuuuuuo", "....ouuuuuuo", "....oaaaaaao", "....oaawwaao", "....oooooooo"],
  // Facilities
  mine: ["", "......oooo", "....oocccaoo", "...occaaaaabo", "..ocaaaaaaaabo", ".ocaaoyyyyoabbo", ".oaaoykkkkyobbo", "oaaaoykkkkyoabbo", "oaaaoykkkkyoabbo", "obaaoykkkkyobbbo", "oooooykkkkyooooo", "oooooooooooooooo"],
  furnace: ["...........ll", "..........oooo", "..........okso", "..........okso", "..........okso", ".oooooooooooooo", ".occcccccccccbo", ".oaabaaabaaabbo", ".oaaaoooooaaabo", ".oabaoyrryoabbo", ".oaaaoryyroaabo", ".oabaorrrroabbo", ".obbboooooobbbo", "oooooooooooooooo"],
  factory: ["", "", ".o....o....o", ".oo...oo...oo", ".ouo..ouo..ouo", ".ouuo.ouuo.ouuo", ".ouuuoouuuoouuuo", ".ooooooooooooooo", ".ocaaaaaaaaaaabo", ".ocayyayyayyaabo", ".ocaaaaaaaaaaabo", ".ocaaaaaaokkoabo", ".obbbbbbbokkobbo", "oooooooooooooooo"],
  plant: ["..oooo", "..olko", "..olko", "..oooo", "..olko...oooo", "..olko..occabo", "..olko.ocaaaaabo", "..olko.ocaaaaabo", "..olkosocaaaaabo", "..olko.oyyyyyyyo", "..olko.ocaaaaabo", "..olko.ocaaaaabo", "..olko.obbbbbbbo", "oooooooooooooooo"],
  power: ["....ll.lll", "...oooooooo", "...ocaaaabo", "....ocaabo", "....ocaabo", "....ocaabo", "...ocaayabo", "..ocaayyaabo", "..ocaaayaabo", "..ocaaaaaabo", ".ocaaaaaaaabo", ".obbbbbbbbbbo", "oooooooooooooooo"],
  solar: ["............yy", ".oooooooooooooo.", ".oluukluukluuuo", ".ouuukuuukuuuuo", ".okkkkkkkkkkkko", ".oluukluukluuuo", ".ouuukuuukuuuuo", ".oooooooooooooo", ".......kk", ".......kk", ".......kk", ".....oooooo", ".....ocaabo", ".....oooooo"],
  wind: outlined(["", ".......l", "......ll", "......ll", "......ll", "......sk", ".....ksskl", "....lk.k.ll", "...ll..k..ll", "..ll...k...l", "..l....k", ".......k", ".......k", "......kkk"]),
  rig: [".......yy", ".......ss", "......s..s", "......ssss", ".....s.ss.s", ".....s....s", "....ssssssss", "....s.s..s.s", "...s...ss...s", "...s..s..s..s", "..ssssssssssss", "..s..........s", ".oooooooooooooo", ".ocaaaaaaaaaabo", ".oooooooooooooo"],
  lab: ["", "......oooo", "......olko", "......olko", "......olko", ".....olllko", "....olllllko", "...olllllllko", "...occcccccao", "..ocaaaaaaaabo", "..oaaawaaaaabo", "..oaaaaaawaabo", "..obbbbbbbbbbo", "...oooooooooo"],
  vault: ["", "", "..oooooooooooo", "..ollllllllllo", "..olssssssssko", "..olssoooossko", "..olsoyaayosko", "..olsoaccaosko", "..olsoyaayosko", "..olssoooossko", "..olssssssssko", "..okkkkkkkkkko", "..oooooooooooo", "...oo......oo"],
  tank: ["", "", ".....oooooo", "...oocccccaoo", "..ocaaaaaaaabo", "..oooooooooooo", "..ocaaaaaaaabo", "..owaaaaaaaabo", "..oyyyyyyyyyyo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..ocaaaaaaaabo", "..obbbbbbbbbbo", ".oooooooooooooo"],
  warehouse: [".......oo", "......ocao", ".....ocaaao", "....ocaaaaao", "...ocaaaaaaao", "..ocaaaaaaaaao", ".ocaaaaaaaaaaao", ".oooooooooooooo", ".osssssssssssko", ".ossokkkkkkosko", ".ossollllllosko", ".ossokkkkkkosko", ".ossollllllosko", "oooooooooooooooo"],
  housing: ["", ".......oo", "......ocao", ".....ocaaao", "....ocaaaaao", "...ocaaaaaaao", "..ocaaaaaaaaao", ".ocaaaaaaaaaaao", ".oooooooooooooo", ".osssssssssssko", ".osyysssssyysko", ".osyysokkosyyko", ".ossssokkossssko", ".ossssokkossssko", "oooooooooooooooo"],
};

// Round shapes are drawn procedurally, then outlined and shaded.
const roundShape = (inside) => {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let row = "";
    for (let x = 0; x < 16; x++) {
      const filled = inside(x + 0.5 - 8, y + 0.5 - 8);
      const edge = filled && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx + 0.5 - 8, y + dy + 0.5 - 8));
      const d = x - y;
      row += !filled ? "." : edge ? "o" : d < -6 ? "b" : d > 5 ? "b" : x + y < 12 ? "c" : x + y > 19 ? "b" : "a";
    }
    rows.push(row);
  }
  return rows;
};
SHAPES.gear = roundShape((x, y) => {
  const r = Math.hypot(x, y), t = Math.atan2(y, x);
  return r > 2.2 && r < (Math.cos(t * 8) > 0.2 ? 7.6 : 5.8);
});
SHAPES.orb = roundShape((x, y) => Math.hypot(x, y) < 6.6);
SHAPES.orb[4] = SHAPES.orb[4].slice(0, 5) + "ww" + SHAPES.orb[4].slice(7);

const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));

// Code-drawn sprites (logo, tab icons, background tile).
const drawn = {};
{
  const g = blank(16, 16);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < 16 && y < 16) g[y][x] = c; };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const corner = (x === 0 || x === 15) && (y === 0 || y === 15);
    if (!corner) set(x, y, x === 0 || y === 0 || x === 15 || y === 15 ? "o" : "k");
  }
  [[10, 2], [11, 2], [9, 3], [10, 3], [11, 3], [12, 3], [9, 4], [10, 4], [11, 4], [12, 4], [10, 5], [11, 5]].forEach(([x, y]) => set(x, y, "y"));
  [[4, 1], [5, 1], [5, 2], [6, 2], [4, 2]].forEach(([x, y]) => set(x, y, "l"));
  for (let y = 3; y <= 10; y++) { set(3, y, "u"); set(4, y, "u"); }
  for (const tx of [5, 9]) for (let i = 0; i < 4; i++) for (let y = 10 - i; y <= 10; y++) set(tx + i, y, "u");
  for (let y = 11; y <= 13; y++) for (let x = 2; x <= 13; x++) set(x, y, "u");
  [4, 7, 10].forEach((x) => { set(x, 12, "y"); set(x + 1, 12, "y"); });
  for (let x = 1; x <= 14; x++) set(x, 14, "s");
  drawn.logo = g;
}
drawn["tab-gauge"] = ["", "", "", ".....oooooo", "...oouuuuuuoo", "..ouukkkkkkuuo", ".oukkkkkkkkkkuo", "ouukkkkkkkkykuuo", "oukkkkkkkkykkkuo", "oukkkkkkkykkkkuo", "oukkkkkkykkkkkuo", "oukkkkkllkkkkkuo", "oooooooooooooooo"];
{
  const g = blank(16, 16);
  [[2, 3], [5, 5], [8, 7], [11, 9]].forEach(([x, h]) => {
    for (let y = 13 - h; y <= 13; y++) for (let dx = -1; dx <= 2; dx++) g[y][x + dx] = dx === -1 || dx === 2 || y === 13 - h ? "o" : dx === 0 ? "c" : "a";
  });
  for (let x = 0; x < 16; x++) g[14][x] = "o";
  [[10, 1], [11, 1], [12, 1], [13, 1], [13, 2], [13, 3], [13, 4], [12, 2], [11, 3]].forEach(([x, y]) => (g[y][x] = "y"));
  drawn["tab-chart"] = g;
}
{
  const g = blank(16, 16);
  for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) {
    if (x === 14 && y === 1) continue;
    const edge = x === 1 || y === 1 || x === 14 || y === 14 || (x === 13 && y === 1) || (x === 14 && y === 2);
    g[y][x] = edge ? "o" : "a";
  }
  for (let y = 2; y <= 5; y++) for (let x = 4; x <= 11; x++) g[y][x] = x === 9 || x === 10 ? "k" : "l";
  for (let y = 8; y <= 13; y++) for (let x = 3; x <= 12; x++) g[y][x] = y === 8 ? "o" : "w";
  [10, 12].forEach((y) => { for (let x = 5; x <= 10; x++) g[y][x] = "l"; });
  drawn["tab-save"] = g;
}
{
  // 32x32 low-contrast riveted floor plate; opacity applied in CSS-free way via fill-opacity.
  const g = blank(32, 32);
  for (let i = 0; i < 32; i++) { g[0][i] = "o"; g[i][0] = "o"; g[16][i] = "d"; g[i][16] = "d"; }
  [[3, 3], [13, 3], [3, 13], [13, 13], [19, 19], [29, 19], [19, 29], [29, 29]].forEach(([x, y]) => { g[y][x] = "h"; g[y + 1][x + 1] = "o"; });
  for (let i = 0; i < 6; i++) { g[22 - i][5 + i] = "h"; g[6 + i][21 + i] = "h"; }
  drawn["bg-tile"] = g;
}
const BG_COLORS = { o: ["#9fb3c8", 0.05], d: ["#000000", 0.35], h: ["#37c6de", 0.12] };

const toGrid = (rows) => {
  const g = blank(16, 16);
  rows.forEach((row, y) => {
    if (row.length > 16) throw new Error(`Row too long (${row.length}): "${row}"`);
    [...row].forEach((ch, x) => (g[y][x] = ch));
  });
  return g;
};

const toSvg = (grid, colorOf) => {
  const h = grid.length, w = grid[0].length;
  let rects = "";
  grid.forEach((row, y) => {
    for (let x = 0; x < w; ) {
      const ch = row[x];
      let end = x + 1;
      while (end < w && row[end] === ch) end++;
      if (ch !== ".") {
        const [fill, opacity] = colorOf(ch);
        if (!fill) throw new Error(`Unknown pixel "${ch}"`);
        rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fill}"${opacity !== undefined ? ` fill-opacity="${opacity}"` : ""}/>`;
      }
      x = end;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects}</svg>\n`;
};

const tintColor = (tint) => (ch) => {
  const idx = "abc".indexOf(ch);
  return [idx >= 0 ? TINTS[tint][idx] : FIXED[ch]];
};

// Clear old generated SVGs, then emit.
for (const f of readdirSync(OUT)) if (f.endsWith(".svg")) unlinkSync(new URL(f, OUT));
const write = (name, svg) => writeFileSync(new URL(`${name}.svg`, OUT), svg);

const source = readFileSync(new URL("index.ts", OUT), "utf8");
const names = new Set([...source.matchAll(/"([a-z]+)-([a-z]+)"/g)].map((m) => m[0].slice(1, -1)));
names.add("crate-steel"); names.add("factory-steel");
let count = 0;
for (const name of names) {
  const [shape, tint] = name.split("-");
  if (drawn[name]) continue;
  if (!SHAPES[shape] || !TINTS[tint]) throw new Error(`Unknown sprite "${name}"`);
  write(name, toSvg(toGrid(SHAPES[shape]), tintColor(tint)));
  count++;
}
write("logo", toSvg(drawn.logo, tintColor("amber")));
write("tab-gauge", toSvg(toGrid(drawn["tab-gauge"]), tintColor("amber")));
write("tab-chart", toSvg(drawn["tab-chart"], tintColor("circuit")));
write("tab-save", toSvg(drawn["tab-save"], tintColor("water")));
write("bg-tile", toSvg(drawn["bg-tile"], (ch) => BG_COLORS[ch]));
console.log(`Generated ${count + 5} sprites in src/assets/art/`);
