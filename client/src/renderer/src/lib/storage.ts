const SERVERS_KEY = 'voxr_servers';
const LAST_KEY = 'voxr_last_server';
const SESSION_KEY = 'voxr_session';
const SHAKE_KEY = 'voxr_shake_enabled';

export function getShakeEnabled(): boolean {
  return localStorage.getItem(SHAKE_KEY) !== 'false';
}

export function setShakeEnabled(enabled: boolean): void {
  localStorage.setItem(SHAKE_KEY, String(enabled));
}

interface SavedSession {
  serverUrl: string;
  username: string;
  token: string;
}

export function saveSession(serverUrl: string, username: string, token: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ serverUrl, username, token }));
}

export function getSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSavedSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export interface SavedServer {
  serverUrl: string;
  username: string;
}

export function getSavedServers(): SavedServer[] {
  try {
    return JSON.parse(localStorage.getItem(SERVERS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getLastServer(): SavedServer | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveServer(serverUrl: string, username: string): void {
  const servers = getSavedServers();
  const exists = servers.some((s) => s.serverUrl === serverUrl && s.username === username);
  if (!exists) {
    servers.push({ serverUrl, username });
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
  }
  localStorage.setItem(LAST_KEY, JSON.stringify({ serverUrl, username }));
}
