/// <reference types="vite/client" />

interface Window {
  electron: {
    platform: string;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}
