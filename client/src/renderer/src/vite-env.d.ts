/// <reference types="vite/client" />

interface Window {
  electron: {
    platform: string;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    shake: () => void;
    notify: (title: string, body: string) => void;
    openExternal: (url: string) => void;
  };
}
