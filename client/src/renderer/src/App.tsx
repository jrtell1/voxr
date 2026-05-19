import { useState, useEffect } from 'react';
import Connect from './components/Connect';
import Chat from './components/Chat';
import TitleBar from './components/TitleBar';
import type { Session } from './types';
import { createSession } from './lib/session';
import { getLastServer } from './lib/storage';
import './App.css';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(() => getLastServer() !== null);

  useEffect(() => {
    const last = getLastServer();
    if (!last) return;

    createSession(last.serverUrl, last.username)
      .then(setSession)
      .catch(() => {})
      .finally(() => setAutoConnecting(false));
  }, []);

  return (
    <>
      <TitleBar />
      {autoConnecting ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Connecting…
        </div>
      ) : session ? (
        <Chat session={session} onDisconnect={() => setSession(null)} />
      ) : (
        <Connect onConnect={setSession} />
      )}
    </>
  );
}
