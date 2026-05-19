import { useState, FormEvent } from 'react';
import { connect } from '../socket';
import type { Session } from '../types';

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
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 rounded-xl p-8 w-[380px] shadow-2xl border border-slate-800">
        <h1 className="text-3xl font-bold mb-1 text-teal-400">Voxr</h1>
        <p className="text-slate-400 mb-6">Connect to a server</p>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            Server URL
          </label>
          <input
            className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 mb-4 outline-none focus:border-teal-500 transition-colors"
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:4000"
            required
          />

          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            Username
          </label>
          <input
            className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 mb-4 outline-none focus:border-teal-500 transition-colors"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            required
            minLength={2}
            maxLength={32}
          />

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg py-3 cursor-pointer mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
