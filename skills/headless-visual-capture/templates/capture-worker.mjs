// Headless capture worker template (playwright-core + system Chromium).
// Copy, then set: ROOT, BOOT_URL, STATE_CHECK, OUT (and optionally VIEWPORT).
// Run: node capture-worker.mjs
// Serves ROOT over node http with correct content types, boots via BOOT_URL,
// waits for STATE_CHECK, settles 2.5s, screenshots to OUT, pixel-verifies non-blank.
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, normalize, resolve, sep, dirname } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';

const ROOT = process.env.ROOT || process.cwd();
const BOOT_URL = process.env.BOOT_URL || '/'; // app's deterministic boot hook
const STATE_CHECK = process.env.STATE_CHECK || ''; // optional: JS expr evaluated until truthy
const OUT = process.env.OUT || '/tmp/target-before.png';
const VIEWPORT = JSON.parse(process.env.VIEWPORT || '[1600,900]');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

function serveFile(request, response) {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(ROOT, normalize(relativePath));
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
    response.writeHead(403).end();
    return;
  }
  stat(filePath).then(file => {
    if (!file.isFile()) throw new Error('not a file');
    response.writeHead(200, { 'content-type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(response);
  }).catch(() => response.writeHead(404).end());
}

const executablePath = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
].find(existsSync);

if (!executablePath) throw new Error('No Chromium executable found');

const server = http.createServer(serveFile);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: VIEWPORT[0], height: VIEWPORT[1] } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(`${baseUrl}${BOOT_URL}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas');
  if (STATE_CHECK) {
    await page.waitForFunction(STATE_CHECK, null, { timeout: 15000 });
  }
  await page.waitForTimeout(2500); // settle haze/lighting/effects

  mkdirSync(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT });

  // Non-blank verification: decode PNG via zlib and sample pixels.
  const buf = await import('node:fs').then(fs => fs.promises.readFile(OUT));
  const png = parsePng(buf);
  const samples = samplePixels(png);
  const distinct = new Set(samples.map(p => `${p[0]},${p[1]},${p[2]}`)).size;
  const luma = samples.map(p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
  const lumaRange = [Math.min(...luma), Math.max(...luma)];

  console.log(JSON.stringify({
    artifact: OUT,
    size: buf.length,
    pageErrors,
    distinctColors: distinct,
    lumaRange,
    blank: distinct < 2 || lumaRange[1] - lumaRange[0] < 10,
    validation: {
      canvas: true,
      stateCheck: STATE_CHECK || '(not set)',
    },
  }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise(r => server.close(r));
}

// Minimal PNG decoder: zlib-inflate IDAT, re-construct RGBA rows.
function parsePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') {
      chunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType] * (bitDepth / 8);
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const recon = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? recon[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      recon[x] = v & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const src = x * bpp;
      const dst = (y * width + x) * 4;
      if (colorType === 2 || colorType === 6) {
        out[dst] = recon[src];
        out[dst + 1] = recon[src + 1];
        out[dst + 2] = recon[src + 2];
        out[dst + 3] = colorType === 6 ? recon[src + 3] : 255;
      } else {
        out[dst] = out[dst + 1] = out[dst + 2] = recon[src];
        out[dst + 3] = 255;
      }
    }
    prev = recon;
  }
  return { width, height, data: out };
}

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function samplePixels(png, step = 64) {
  const samples = [];
  for (let y = 0; y < png.height; y += step) {
    for (let x = 0; x < png.width; x += step) {
      const i = (y * png.width + x) * 4;
      samples.push([png.data[i], png.data[i + 1], png.data[i + 2]]);
    }
  }
  return samples;
}
