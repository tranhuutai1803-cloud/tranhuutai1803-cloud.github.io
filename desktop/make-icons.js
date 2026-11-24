// renders the Daruma icon (web/icon.svg) at the exact sizes Windows uses, for build/icon.ico and icon.png
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SVG = fs.readFileSync(process.argv[2] || path.join(__dirname, '../app/web/icon.svg'), 'utf8');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  fs.mkdirSync(path.join(__dirname, 'build/png'), {recursive: true});
  for (const s of [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]) {
    await p.setViewportSize({width: s, height: s});
    await p.setContent(`<html><body style="margin:0;background:transparent">${SVG.replace('<svg ', `<svg width="${s}" height="${s}" style="display:block" `)}</body></html>`);
    await p.screenshot({path: path.join(__dirname, `build/png/${s}.png`), omitBackground: true});
  }
  await b.close(); })();
