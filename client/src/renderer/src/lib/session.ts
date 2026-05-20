import { connect } from '../socket';
import type { Session, DmChannel } from '../types';

export async function createSession(
  serverUrl: string,
  username: string,
  password: string,
  mode: 'login' | 'register',
): Promise<Session> {
  const [infoRes, channelsRes, authRes] = await Promise.all([
    fetch(`${serverUrl}/api/info`),
    fetch(`${serverUrl}/api/channels`),
    fetch(`${serverUrl}/api/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    }),
  ]);

  if (!infoRes.ok) throw new Error('Server unreachable');
  if (!authRes.ok) {
    const body = await authRes.json().catch(() => null);
    throw new Error(body?.error ?? 'Authentication failed');
  }

  const info: { name: string } = await infoRes.json();
  const channels = await channelsRes.json();
  const { token } = await authRes.json();

  return connectSocket(serverUrl, username.trim(), channels, info.name, token);
}

export async function resumeSession(
  serverUrl: string,
  username: string,
  token: string,
): Promise<Session> {
  const [infoRes, channelsRes] = await Promise.all([
    fetch(`${serverUrl}/api/info`),
    fetch(`${serverUrl}/api/channels`),
  ]);

  if (!infoRes.ok) throw new Error('Server unreachable');

  const info: { name: string } = await infoRes.json();
  const channels = await channelsRes.json();

  return connectSocket(serverUrl, username, channels, info.name, token);
}

function connectSocket(
  serverUrl: string,
  username: string,
  channels: Session['channels'],
  serverName: string,
  token: string,
): Promise<Session> {
  const socket = connect(serverUrl.replace(/^http/, 'ws'), token);

  return new Promise((resolve, reject) => {
    const userChannel = socket.channel('user:me');
    userChannel
      .join()
      .receive('ok', ({ unread_counts, display_name, dm_channels }: { unread_counts: Record<number, number>; display_name: string | null; dm_channels: DmChannel[] }) => {
        resolve({ socket, userChannel, serverUrl, serverName, username, displayName: display_name, channels, initialUnread: unread_counts, dmChannels: dm_channels ?? [], token });
      })
      .receive('error', () => {
        socket.disconnect();
        reject(new Error('Connection failed'));
      });
  });
}
