import { contextBridge } from "electron";

// Expose any privileged APIs to the renderer here.
// For now the renderer handles the Phoenix socket directly.
contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
});
