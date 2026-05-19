import { useState, FormEvent } from 'react';
import { connect } from '../socket';
import type { Session } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  onConnect: (session: Session) => void;
}

export default function Connect({ onConnect }: Props) {
  const [serverUrl, setServerUrl] = useState('http://localhost:4000');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const [infoRes, channelsRes] = await Promise.all([
        fetch(`${serverUrl}/api/info`),
        fetch(`${serverUrl}/api/channels`),
      ]);

      if (!infoRes.ok) throw new Error('Server unreachable');

      const info: { name: string } = await infoRes.json();
      const channels = await channelsRes.json();
      const socket = connect(serverUrl.replace(/^http/, 'ws'), username.trim());

      const userChannel = socket.channel('user:me');

      userChannel
        .join()
        .receive('ok', ({ unread_counts }: { unread_counts: Record<number, number> }) => {
          onConnect({
            socket,
            userChannel,
            serverUrl,
            serverName: info.name,
            username: username.trim(),
            channels,
            initialUnread: unread_counts,
          });
        })
        .receive('error', () => {
          onConnect({
            socket,
            userChannel,
            serverUrl,
            serverName: info.name,
            username: username.trim(),
            channels,
            initialUnread: {},
          });
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="w-[380px]">
        <CardHeader>
          <CardTitle className="text-2xl">Voxr</CardTitle>
          <CardDescription>Connect to a server</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:4000"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
                minLength={2}
                maxLength={32}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Connecting…' : 'Connect'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
