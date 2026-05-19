import { useState, useEffect, useRef, FormEvent } from 'react';
import { Channel as PhxChannel } from 'phoenix';
import { disconnect } from '../socket';
import type { Session, Channel, Message } from '../types';

interface Props {
  session: Session;
  onDisconnect: () => void;
}

export default function Chat({ session, onDisconnect }: Props) {
  const { socket, userChannel, serverName, username, channels, initialUnread } = session;
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState<Record<number, number>>(initialUnread);
  const channelRef = useRef<PhxChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    userChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
      setUnread((prev) => ({ ...prev, [channel_id]: count }));
    });

    return () => userChannel.off('unread_updated');
  }, [userChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function joinChannel(channel: Channel) {
    const doJoin = () => {
      const phxChannel = socket.channel(`room:${channel.id}`);

      phxChannel
        .join()
        .receive('ok', ({ messages: history }: { messages: Message[] }) => {
          setMessages(history);
          setActiveChannel(channel);
          setUnread((prev) => ({ ...prev, [channel.id]: 0 }));
        })
        .receive('error', (err: unknown) => console.error('Join error', err));

      phxChannel.on('new_message', (msg: Message) => {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      });

      phxChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
        setUnread((prev) => ({ ...prev, [channel_id]: count }));
      });

      channelRef.current = phxChannel;
    };

    if (channelRef.current) {
      const old = channelRef.current;
      channelRef.current = null;
      old.off('new_message');
      old.off('unread_updated');
      old.leave().receive('ok', doJoin);
    } else {
      doJoin();
    }
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !channelRef.current) return;
    channelRef.current.push('send_message', { content });
    setInput('');
  }

  function handleDisconnect() {
    disconnect();
    onDisconnect();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] bg-gray-800 flex flex-col shrink-0 select-none">
        <div className="px-4 py-3 font-bold border-b border-gray-700 text-sm truncate">
          {serverName}
        </div>

        <div className="px-4 pt-4 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
          Text Channels
        </div>

        <div className="flex-1 overflow-y-auto">
          {channels.map((ch) => {
            const count = unread[ch.id] ?? 0;
            const isActive = activeChannel?.id === ch.id;
            return (
              <button
                key={ch.id}
                className={`flex items-center gap-1 w-[calc(100%-1rem)] mx-2 my-px px-2 py-1.5 rounded-md border-none cursor-pointer text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-gray-50'
                    : 'bg-transparent text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                }`}
                onClick={() => joinChannel(ch)}
              >
                <span className="text-gray-500">#</span>
                <span className="flex-1">{ch.name}</span>
                {count > 0 && !isActive && (
                  <span className="bg-red-500 text-white rounded-full text-xs font-bold px-1.5 min-w-[18px] text-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-3 py-3 border-t border-gray-700 flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {username[0].toUpperCase()}
          </div>
          <span className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
            {username}
          </span>
          <button
            className="bg-transparent border-none text-gray-500 hover:text-gray-300 cursor-pointer text-sm p-0.5 transition-colors"
            onClick={handleDisconnect}
            title="Disconnect"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeChannel ? (
          <>
            <div className="px-4 py-3 border-b border-gray-700 font-semibold text-sm shrink-0 flex items-center gap-2">
              <span className="text-gray-400">#</span>
              {activeChannel.name}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-0.5 select-text">
              {messages.map((msg, i) => (
                <div key={msg.id ?? i} className="flex gap-3 px-2 py-1 rounded-md hover:bg-gray-800/60">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {msg.user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{msg.user.display_name ?? msg.user.username}</span>
                      <span className="text-xs text-gray-500">{formatTime(msg.inserted_at)}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 flex gap-2 shrink-0">
              <input
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-gray-50 outline-none focus:border-indigo-500"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeChannel.name}`}
                autoFocus
              />
              <button
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-none rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-colors"
                type="submit"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
