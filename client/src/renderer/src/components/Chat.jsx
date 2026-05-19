import { useState, useEffect, useRef } from "react";
import { disconnect } from "../socket";

export default function Chat({ session, onDisconnect }) {
  const { socket, serverUrl, serverName, username, channels } = session;
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const channelRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function joinChannel(channel) {
    if (channelRef.current) {
      channelRef.current.leave();
    }

    const phxChannel = socket.channel(`room:${channel.id}`);

    phxChannel.join()
      .receive("ok", ({ messages: history }) => {
        setMessages(history);
        setActiveChannel(channel);
      })
      .receive("error", (err) => console.error("Join error", err));

    phxChannel.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    channelRef.current = phxChannel;
  }

  function sendMessage(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !channelRef.current) return;

    channelRef.current.push("send_message", { content });
    setInput("");
  }

  function handleDisconnect() {
    disconnect();
    onDisconnect();
  }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.serverName}>{serverName}</div>

        <div style={styles.sectionLabel}>Text Channels</div>
        {channels.map((ch) => (
          <button
            key={ch.id}
            style={{
              ...styles.channelBtn,
              ...(activeChannel?.id === ch.id ? styles.channelActive : {}),
            }}
            onClick={() => joinChannel(ch)}
          >
            <span style={styles.hash}>#</span> {ch.name}
          </button>
        ))}

        <div style={styles.userBar}>
          <div style={styles.avatar}>{username[0].toUpperCase()}</div>
          <span style={styles.username}>{username}</span>
          <button style={styles.disconnectBtn} onClick={handleDisconnect} title="Disconnect">✕</button>
        </div>
      </div>

      {/* Main */}
      <div style={styles.main}>
        {activeChannel ? (
          <>
            <div style={styles.header}>
              <span style={{ color: "#9ca3af" }}>#</span> {activeChannel.name}
            </div>

            <div style={styles.messages}>
              {messages.map((msg, i) => (
                <div key={msg.id ?? i} style={styles.message}>
                  <div style={styles.msgAvatar}>{msg.user.username[0].toUpperCase()}</div>
                  <div>
                    <div style={styles.msgMeta}>
                      <span style={styles.msgUsername}>{msg.user.display_name || msg.user.username}</span>
                      <span style={styles.msgTime}>{formatTime(msg.inserted_at)}</span>
                    </div>
                    <p style={styles.msgContent}>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} style={styles.inputRow}>
              <input
                style={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeChannel.name}`}
                autoFocus
              />
              <button style={styles.sendBtn} type="submit">Send</button>
            </form>
          </>
        ) : (
          <div style={styles.empty}>Select a channel to start chatting</div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = {
  root: { display: "flex", height: "100vh", overflow: "hidden" },
  sidebar: {
    width: 220,
    background: "#1f2937",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  serverName: {
    padding: "0.75rem 1rem",
    fontWeight: 700,
    borderBottom: "1px solid #374151",
    fontSize: 15,
  },
  sectionLabel: {
    padding: "1rem 1rem 0.25rem",
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  channelBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    width: "calc(100% - 1rem)",
    margin: "1px 0.5rem",
    padding: "0.35rem 0.5rem",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    color: "#9ca3af",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
  },
  channelActive: { background: "#374151", color: "#f9fafb" },
  hash: { color: "#6b7280" },
  userBar: {
    marginTop: "auto",
    padding: "0.75rem",
    borderTop: "1px solid #374151",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    background: "#4f46e5",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  username: { flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  disconnectBtn: {
    background: "transparent",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: 14,
    padding: 2,
  },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #374151",
    fontWeight: 600,
    fontSize: 15,
    flexShrink: 0,
  },
  messages: { flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: 2 },
  message: { display: "flex", gap: 12, padding: "0.25rem 0.5rem", borderRadius: 6 },
  msgAvatar: {
    width: 32,
    height: 32,
    background: "#4f46e5",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 2,
  },
  msgMeta: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 },
  msgUsername: { fontWeight: 600, fontSize: 14 },
  msgTime: { fontSize: 11, color: "#6b7280" },
  msgContent: { fontSize: 14, color: "#d1d5db", lineHeight: 1.5 },
  inputRow: { padding: "1rem", display: "flex", gap: 8, flexShrink: 0 },
  input: {
    flex: 1,
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 8,
    padding: "0.6rem 0.8rem",
    color: "#f9fafb",
    outline: "none",
  },
  sendBtn: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.6rem 1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" },
};
