import { useState } from 'react';
import Connect from './components/Connect';
import Chat from './components/Chat';
import TitleBar from './components/TitleBar';
import type { Session } from './types';
import './App.css';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  return (
    <>
      <TitleBar />
      {session ? (
        <Chat session={session} onDisconnect={() => setSession(null)} />
      ) : (
        <Connect onConnect={setSession} />
      )}
    </>
  );
}
