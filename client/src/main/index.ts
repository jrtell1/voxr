import { app, BrowserWindow, ipcMain, IpcMainEvent, Notification, session, shell } from 'electron';
import { join } from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#333333',
    frame: true,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function getWindow(e: IpcMainEvent) {
  return BrowserWindow.fromWebContents(e.sender);
}

ipcMain.on('window:minimize', (e) => getWindow(e)?.minimize());
ipcMain.on('window:maximize', (e) => {
  const win = getWindow(e);
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window:close', (e) => getWindow(e)?.close());

let lastShake = 0;

ipcMain.on('window:shake', (e) => {
  const now = Date.now();
  if (now - lastShake < 60_000) return;
  lastShake = now;

  const win = getWindow(e);
  if (!win) return;

  const [origX, origY] = win.getPosition();
  const frames = [
    [15, 0], [-15, 5], [12, -5], [-12, 5],
    [10, -3], [-10, 3], [6, -2], [-6, 2],
    [3, 0], [-3, 0], [0, 0],
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i >= frames.length) {
      clearInterval(interval);
      win.setPosition(origX, origY);
      return;
    }
    const [dx, dy] = frames[i++];
    win.setPosition(origX + dx, origY + dy);
  }, 50);
});

ipcMain.on('shell:openExternal', (_, url: string) => shell.openExternal(url));

ipcMain.on('notification:show', (_, { title, body }: { title: string; body: string }) => {
  new Notification({ title, body }).show();
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media';
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
