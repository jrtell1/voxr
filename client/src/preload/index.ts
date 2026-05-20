import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  shake: () => ipcRenderer.send('window:shake'),
  notify: (title: string, body: string) => ipcRenderer.send('notification:show', { title, body }),
});
