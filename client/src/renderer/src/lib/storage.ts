const SERVERS_KEY = 'voxr_servers';
const LAST_KEY = 'voxr_last_server';

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
