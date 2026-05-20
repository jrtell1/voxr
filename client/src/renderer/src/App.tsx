import { useState, useEffect } from 'react';
import Connect from './components/Connect';
import Chat from './components/Chat';
import type { Session } from './types';
import { resumeSession } from './lib/session';
import { getSavedSession, saveSession, clearSavedSession } from './lib/storage';
import './App.css';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(() => getSavedSession() !== null);

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved) return;

    resumeSession(saved.serverUrl, saved.username, saved.token)
      .then(handleConnect)
      .catch(() => {
        clearSavedSession();
      })
      .finally(() => setAutoConnecting(false));
  }, []);

  function handleConnect(s: Session) {
    saveSession(s.serverUrl, s.username, s.token);
    setSession(s);
  }

  function handleDisconnect() {
    clearSavedSession();
    setSession(null);
  }

  return (
    <>
      {autoConnecting ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Connecting…
        </div>
      ) : session ? (
        <Chat session={session} onDisconnect={handleDisconnect} />
      ) : (
        <Connect onConnect={handleConnect} />
      )}
    </>
  );
}
