import { connect } from '../socket';
import type { Session } from '../types';

export async function createSession(serverUrl: string, username: string): Promise<Session> {
  const [infoRes, channelsRes] = await Promise.all([
    fetch(`${serverUrl}/api/info`),
    fetch(`${serverUrl}/api/channels`),
  ]);

  if (!infoRes.ok) throw new Error('Server unreachable');

  const info: { name: string } = await infoRes.json();
  const channels = await channelsRes.json();
  const socket = connect(serverUrl.replace(/^http/, 'ws'), username.trim());

  return new Promise((resolve) => {
    const userChannel = socket.channel('user:me');
    userChannel
      .join()
      .receive('ok', ({ unread_counts }: { unread_counts: Record<number, number> }) => {
        resolve({ socket, userChannel, serverUrl, serverName: info.name, username: username.trim(), channels, initialUnread: unread_counts });
      })
      .receive('error', () => {
        resolve({ socket, userChannel, serverUrl, serverName: info.name, username: username.trim(), channels, initialUnread: {} });
      });
  });
}
