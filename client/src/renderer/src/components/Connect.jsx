import { useState } from "react";
import { connect } from "../socket";

export default function Connect({ onConnect }) {
  const [serverUrl, setServerUrl] = useState("http://localhost:4000");
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${serverUrl}/api/info`);
      if (!res.ok) throw new Error("Server unreachable");
      const info = await res.json();

      const socket = connect(serverUrl.replace(/^http/, "ws"), username.trim());

      const channelsRes = await fetch(`${serverUrl}/api/channels`);
      const channels = await channelsRes.json();

      onConnect({ socket, serverUrl, serverName: info.name, username: username.trim(), channels });
    } catch (err) {
      setError(err.message || "Could not connect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Voxr</h1>
        <p style={styles.subtitle}>Connect to a server</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Server URL</label>
          <input
            style={styles.input}
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:4000"
            required
          />

          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            required
            minLength={2}
            maxLength={32}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Connecting…" : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111827",
  },
  card: {
    background: "#1f2937",
    borderRadius: 12,
    padding: "2rem",
    width: 380,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "#9ca3af", marginBottom: "1.5rem" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase" },
  input: {
    display: "block",
    width: "100%",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 8,
    padding: "0.6rem 0.8rem",
    color: "#f9fafb",
    marginBottom: "1rem",
    outline: "none",
  },
  error: { color: "#f87171", fontSize: 13, marginBottom: "0.75rem" },
  button: {
    width: "100%",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
};
