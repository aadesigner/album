import sharp from '../../../node_modules/.pnpm/node_modules/sharp/lib/index.js';
import fs from 'fs';

const LAYOUTS = [
  { id: 'full', zones: [{ x: 0, y: 0, w: 1, h: 1 }] },
  { id: 'bordered-single', zones: [{ x: 0.06, y: 0.05, w: 0.88, h: 0.9 }] },
  { id: 'portrait-center', zones: [{ x: 0.12, y: 0.08, w: 0.76, h: 0.84 }] },
  { id: 'photo-cap', zones: [{ x: 0, y: 0, w: 1, h: 0.74 }] },
  { id: 'cap-top', zones: [{ x: 0, y: 0.26, w: 1, h: 0.74 }] },
  { id: 'photo-text-r', zones: [{ x: 0, y: 0, w: 0.6, h: 1 }] },
  { id: 'two-h', zones: [{ x: 0, y: 0, w: 0.487, h: 1 }, { x: 0.513, y: 0, w: 0.487, h: 1 }] },
  { id: 'two-v', zones: [{ x: 0, y: 0, w: 1, h: 0.487 }, { x: 0, y: 0.513, w: 1, h: 0.487 }] },
  { id: 'two-h-6040', zones: [{ x: 0, y: 0, w: 0.6, h: 1 }, { x: 0.62, y: 0, w: 0.38, h: 1 }] },
  { id: 'two-h-4060', zones: [{ x: 0, y: 0, w: 0.38, h: 1 }, { x: 0.4, y: 0, w: 0.6, h: 1 }] },
  { id: 'two-h-inset', zones: [{ x: 0.03, y: 0.04, w: 0.455, h: 0.92 }, { x: 0.515, y: 0.04, w: 0.455, h: 0.92 }] },
  { id: 'two-v-7030', zones: [{ x: 0, y: 0, w: 1, h: 0.68 }, { x: 0, y: 0.7, w: 1, h: 0.3 }] },
  { id: 'two-v-3070', zones: [{ x: 0, y: 0, w: 1, h: 0.3 }, { x: 0, y: 0.32, w: 1, h: 0.68 }] },
  { id: 'strips-3', zones: [{ x: 0, y: 0, w: 1, h: 0.316 }, { x: 0, y: 0.342, w: 1, h: 0.316 }, { x: 0, y: 0.684, w: 1, h: 0.316 }] },
  { id: 'land-2port', zones: [{ x: 0, y: 0, w: 1, h: 0.487 }, { x: 0, y: 0.513, w: 0.487, h: 0.487 }, { x: 0.513, y: 0.513, w: 0.487, h: 0.487 }] },
  { id: 'port-2land', zones: [{ x: 0, y: 0, w: 0.487, h: 0.487 }, { x: 0.513, y: 0, w: 0.487, h: 0.487 }, { x: 0, y: 0.513, w: 1, h: 0.487 }] },
  { id: 'hero-l', zones: [{ x: 0, y: 0, w: 0.35, h: 0.487 }, { x: 0, y: 0.513, w: 0.35, h: 0.487 }, { x: 0.37, y: 0, w: 0.63, h: 1 }] },
  { id: 'hero-r', zones: [{ x: 0, y: 0, w: 0.63, h: 1 }, { x: 0.65, y: 0, w: 0.35, h: 0.487 }, { x: 0.65, y: 0.513, w: 0.35, h: 0.487 }] },
  { id: 'tall-l-2r', zones: [{ x: 0, y: 0, w: 0.55, h: 1 }, { x: 0.57, y: 0, w: 0.43, h: 0.487 }, { x: 0.57, y: 0.513, w: 0.43, h: 0.487 }] },
  { id: 'triptych', zones: [{ x: 0, y: 0, w: 0.316, h: 1 }, { x: 0.342, y: 0, w: 0.316, h: 1 }, { x: 0.684, y: 0, w: 0.316, h: 1 }] },
  { id: 'strips-3-uneven', zones: [{ x: 0, y: 0, w: 1, h: 0.38 }, { x: 0, y: 0.4, w: 1, h: 0.2 }, { x: 0, y: 0.62, w: 1, h: 0.38 }] },
  { id: 'strips-3-focus', zones: [{ x: 0, y: 0, w: 1, h: 0.22 }, { x: 0, y: 0.24, w: 1, h: 0.52 }, { x: 0, y: 0.78, w: 1, h: 0.22 }] },
  { id: 'three-mid', zones: [{ x: 0, y: 0.13, w: 0.316, h: 0.74 }, { x: 0.342, y: 0.13, w: 0.316, h: 0.74 }, { x: 0.684, y: 0.13, w: 0.316, h: 0.74 }] },
  { id: 'strips-4', zones: [{ x: 0, y: 0, w: 1, h: 0.235 }, { x: 0, y: 0.255, w: 1, h: 0.235 }, { x: 0, y: 0.51, w: 1, h: 0.235 }, { x: 0, y: 0.765, w: 1, h: 0.235 }] },
  { id: 'hero-3r', zones: [{ x: 0, y: 0, w: 0.63, h: 1 }, { x: 0.65, y: 0, w: 0.35, h: 0.316 }, { x: 0.65, y: 0.342, w: 0.35, h: 0.316 }, { x: 0.65, y: 0.684, w: 0.35, h: 0.316 }] },
  { id: 'grid4', zones: [{ x: 0, y: 0, w: 0.487, h: 0.487 }, { x: 0.513, y: 0, w: 0.487, h: 0.487 }, { x: 0, y: 0.513, w: 0.487, h: 0.487 }, { x: 0.513, y: 0.513, w: 0.487, h: 0.487 }] },
  { id: 'hero-3l', zones: [{ x: 0, y: 0, w: 0.35, h: 0.316 }, { x: 0, y: 0.342, w: 0.35, h: 0.316 }, { x: 0, y: 0.684, w: 0.35, h: 0.316 }, { x: 0.37, y: 0, w: 0.63, h: 1 }] },
  { id: 'corner-4', zones: [{ x: 0, y: 0, w: 0.63, h: 0.63 }, { x: 0.65, y: 0, w: 0.35, h: 0.305 }, { x: 0.65, y: 0.325, w: 0.35, h: 0.305 }, { x: 0, y: 0.65, w: 1, h: 0.35 }] },
  { id: 'corner-4-inv', zones: [{ x: 0, y: 0, w: 1, h: 0.35 }, { x: 0, y: 0.37, w: 0.35, h: 0.305 }, { x: 0, y: 0.695, w: 0.35, h: 0.305 }, { x: 0.37, y: 0.37, w: 0.63, h: 0.63 }] },
  { id: 'cols-4', zones: [{ x: 0, y: 0, w: 0.235, h: 1 }, { x: 0.255, y: 0, w: 0.235, h: 1 }, { x: 0.51, y: 0, w: 0.235, h: 1 }, { x: 0.765, y: 0, w: 0.235, h: 1 }] },
  { id: 'top-3below', zones: [{ x: 0, y: 0, w: 1, h: 0.55 }, { x: 0, y: 0.57, w: 0.316, h: 0.43 }, { x: 0.342, y: 0.57, w: 0.316, h: 0.43 }, { x: 0.684, y: 0.57, w: 0.316, h: 0.43 }] },
];

const W = 90;
const H = 120;
const out = new URL('./refs/', import.meta.url);
fs.mkdirSync(out, { recursive: true });

for (const L of LAYOUTS) {
  const buf = Buffer.alloc(W * H * 3, 255);
  for (const z of L.zones) {
    const x0 = Math.round(z.x * W);
    const y0 = Math.round(z.y * H);
    const x1 = Math.min(W, Math.round((z.x + z.w) * W));
    const y1 = Math.min(H, Math.round((z.y + z.h) * H));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 3;
        buf[i] = 110;
        buf[i + 1] = 130;
        buf[i + 2] = 150;
      }
    }
  }
  const file = new URL(`./refs/${L.id}.png`, import.meta.url);
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(file);
}

const cols = 8;
const rows = Math.ceil(LAYOUTS.length / cols);
const sheetW = cols * (W + 8) + 8;
const sheetH = rows * (H + 24) + 8;
const composites = LAYOUTS.map((L, i) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  return {
    input: new URL(`./refs/${L.id}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    left: 8 + c * (W + 8),
    top: 8 + r * (H + 24),
  };
});
const texts = LAYOUTS.map((L, i) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = 8 + c * (W + 8);
  const y = 8 + r * (H + 24) + H + 14;
  return `<text x="${x}" y="${y}" font-size="9" font-family="Arial">${L.id}</text>`;
}).join('');
const svg = Buffer.from(`<svg width="${sheetW}" height="${sheetH}">${texts}</svg>`);
await sharp({
  create: { width: sheetW, height: sheetH, channels: 3, background: { r: 245, g: 245, b: 245 } },
})
  .composite([...composites, { input: svg, left: 0, top: 0 }])
  .png()
  .toFile(new URL('./layout-sheet.png', import.meta.url));
console.log('ok', LAYOUTS.length);
