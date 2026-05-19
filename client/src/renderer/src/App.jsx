import { useState } from "react";
import Connect from "./components/Connect";
import Chat from "./components/Chat";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null);

  return session ? (
    <Chat session={session} onDisconnect={() => setSession(null)} />
  ) : (
    <Connect onConnect={setSession} />
  );
}
