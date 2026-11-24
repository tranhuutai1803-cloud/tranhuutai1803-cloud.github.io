// Daruma N3 for Windows: the Daruma N3 website in its own program window, installed like any other program.
// The content comes from the website, so each new version of Daruma N3 arrives without reinstalling; the site's
// service worker keeps a copy, so the program also opens without a network after the first start. The page sees
// "DarumaN3Desktop/<version>" in the user agent and runs as the installed app: sign-in required, all progress
// saved on the group's server.
'use strict';
const { app, BrowserWindow, Menu, shell, clipboard, screen, nativeTheme, session } = require('electron');
const path = require('path'), fs = require('fs');

const SITE = (!app.isPackaged && process.env.DARUMA_SITE) || 'https://tranhuutai1803-cloud.github.io/';
const HOME = new URL(SITE), START = new URL('?app=1', HOME).href;
const OFFLINE = path.join(__dirname, 'offline.html');
const sameOrigin = u => { try { return new URL(u).origin === HOME.origin; } catch (e) { return false; } };
// only the app page itself opens inside the window; every other address goes to the normal web browser
const isAppPage = u => { try { const x = new URL(u); return x.origin === HOME.origin && (x.pathname === HOME.pathname || x.pathname === HOME.pathname + 'index.html'); } catch (e) { return false; } };
const isOfflinePage = u => { try { const x = new URL(u); return x.protocol === 'file:' && decodeURIComponent(x.pathname).replace(/\\/g, '/').endsWith('/offline.html'); } catch (e) { return false; } };
const openOutside = u => { if (/^(https?|mailto):/i.test(u)) shell.openExternal(u).catch(() => {}); };

if (!app.isPackaged && process.env.DARUMA_USERDATA) app.setPath('userData', process.env.DARUMA_USERDATA);   // tests only
app.setAppUserModelId('io.github.tranhuutai1803.daruma');
app.userAgentFallback = `${app.userAgentFallback} DarumaN3Desktop/${app.getVersion()}`;
if (process.platform !== 'linux') app.enableSandbox();   // every renderer sandboxed (Linux is only used for tests, run as root there)

let win = null;
if (!app.requestSingleInstanceLock()) app.quit();   // a second start only brings the open window forward
else {
  app.on('second-instance', () => { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); });
  app.whenReady().then(start);
}
app.on('window-all-closed', () => app.quit());
app.on('web-contents-created', (e, wc) => { wc.on('will-attach-webview', ev => ev.preventDefault()); });

// window size and position are kept between starts
const stateFile = () => path.join(app.getPath('userData'), 'window.json');
function loadState() {
  const a = screen.getPrimaryDisplay().workAreaSize;
  const def = {width: Math.min(1280, a.width), height: Math.min(860, a.height), maximized: a.width < 1100};
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (!(s.width >= 380 && s.height >= 480 && Number.isFinite(s.x) && Number.isFinite(s.y))) return def;
    const w = screen.getDisplayMatching(s).workArea;   // the screen it was on may be gone
    if (s.x + 120 > w.x + w.width || s.x + s.width < w.x + 120 || s.y < w.y - 8 || s.y + 60 > w.y + w.height) return {...def, maximized: !!s.maximized};
    return s;
  } catch (e) { return def; }
}
function saveState() {
  try { if (!win || win.isDestroyed() || win.isMinimized()) return; fs.writeFileSync(stateFile(), JSON.stringify({...win.getNormalBounds(), maximized: win.isMaximized()})); } catch (e) {}
}

function start() {
  Menu.setApplicationMenu(null);
  const ses = session.defaultSession;
  const ALLOW = new Set(['clipboard-sanitized-write', 'fullscreen', 'notifications']);
  ses.setPermissionRequestHandler((wc, perm, cb, d) => cb(ALLOW.has(perm) && sameOrigin((d && d.requestingUrl) || wc.getURL())));
  ses.setPermissionCheckHandler((wc, perm, origin) => ALLOW.has(perm) && sameOrigin(origin));

  const st = loadState();
  win = new BrowserWindow({
    x: st.x, y: st.y, width: st.width, height: st.height, minWidth: 380, minHeight: 480,
    title: 'Daruma N3', show: false, autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0d1120' : '#eef1f7',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, webviewTag: false, navigateOnDragDrop: false}
  });
  const wc = win.webContents;
  const reveal = () => { if (win.isVisible()) return; if (st.maximized) win.maximize(); win.show(); };
  win.once('ready-to-show', reveal);
  setTimeout(() => { if (win && !win.isDestroyed()) reveal(); }, 4000);
  win.on('page-title-updated', e => e.preventDefault());   // the title bar always says Daruma N3
  win.on('close', saveState);

  // no network at the very first start (later starts open from the saved copy): a local page that retries
  wc.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (!isMain || code === -3 || isOfflinePage(url)) return;   // -3: replaced by a newer navigation
    win.loadFile(OFFLINE, {query: {u: START}});
  });
  wc.on('will-navigate', (e, url) => { if (isAppPage(url) || isOfflinePage(url)) return; e.preventDefault(); openOutside(url); });
  wc.setWindowOpenHandler(({url}) => { if (isAppPage(url)) setImmediate(() => win.loadURL(url)); else openOutside(url); return {action: 'deny'}; });
  wc.on('render-process-gone', (e, d) => { if (d.reason !== 'clean-exit') setTimeout(() => { if (win && !win.isDestroyed()) wc.reload(); }, 600); });

  // keys a program usually has: F5 reload, F11 full screen, Ctrl + / - / 0 zoom
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const ctrl = i.control || i.meta, k = i.key;
    const zoom = z => { e.preventDefault(); wc.setZoomLevel(Math.max(-3, Math.min(3, z))); };
    if (k === 'F5' || (ctrl && (k === 'r' || k === 'R'))) { e.preventDefault(); if (i.shift || (ctrl && k === 'F5')) wc.reloadIgnoringCache(); else wc.reload(); }
    else if (k === 'F11') { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
    else if (ctrl && (k === '=' || k === '+')) zoom(wc.getZoomLevel() + 0.5);
    else if (ctrl && k === '-') zoom(wc.getZoomLevel() - 0.5);
    else if (ctrl && k === '0') zoom(0);
    else if (!app.isPackaged && (k === 'F12' || (ctrl && i.shift && (k === 'i' || k === 'I')))) wc.toggleDevTools();
  });

  // right-click menu in Vietnamese: cut, copy, paste in text boxes; copy selected text; links open in the web browser
  wc.on('context-menu', (e, p) => {
    const m = [], f = p.editFlags || {};
    if (p.isEditable) m.push({label: 'Hoàn tác', role: 'undo', enabled: !!f.canUndo}, {type: 'separator'},
      {label: 'Cắt', role: 'cut', enabled: !!f.canCut}, {label: 'Sao chép', role: 'copy', enabled: !!f.canCopy},
      {label: 'Dán', role: 'paste', enabled: !!f.canPaste}, {type: 'separator'}, {label: 'Chọn tất cả', role: 'selectAll'});
    else if (p.selectionText && p.selectionText.trim()) m.push({label: 'Sao chép', role: 'copy'});
    if (p.linkURL && /^https?:/i.test(p.linkURL) && !isAppPage(p.linkURL)) {
      if (m.length) m.push({type: 'separator'});
      m.push({label: 'Mở liên kết bằng trình duyệt', click: () => openOutside(p.linkURL)}, {label: 'Sao chép liên kết', click: () => clipboard.writeText(p.linkURL)});
    }
    if (!m.length) m.push({label: 'Tải lại (F5)', click: () => wc.reload()});
    Menu.buildFromTemplate(m).popup({window: win});
  });

  win.loadURL(START);
}
