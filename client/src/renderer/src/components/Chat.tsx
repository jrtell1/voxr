import { useState, useEffect, useRef, FormEvent } from 'react';
import { Channel as PhxChannel } from 'phoenix';
import { disconnect } from '../socket';
import type { Session, Channel, Message } from '../types';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';

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
  const [displayName, setDisplayName] = useState<string | null>(session.displayName);
  const [unreadStartIndex, setUnreadStartIndex] = useState<number | null>(null);
  const channelRef = useRef<PhxChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const scrollToUnread = useRef(false);

  useEffect(() => {
    userChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
      setUnread((prev) => ({ ...prev, [channel_id]: count }));
    });

    return () => userChannel.off('unread_updated');
  }, [userChannel]);

  useEffect(() => {
    if (scrollToUnread.current && dividerRef.current) {
      dividerRef.current.scrollIntoView();
      scrollToUnread.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [messages]);

  function joinChannel(channel: Channel) {
    const doJoin = () => {
      const phxChannel = socket.channel(`room:${channel.id}`);

      phxChannel
        .join()
        .receive('ok', ({ messages: history }: { messages: Message[] }) => {
          const unreadCount = unread[channel.id] ?? 0;
          setMessages(history);
          setActiveChannel(channel);
          setUnread((prev) => ({ ...prev, [channel.id]: 0 }));
          if (unreadCount > 0 && history.length > 0) {
            setUnreadStartIndex(Math.max(0, history.length - unreadCount));
            scrollToUnread.current = true;
          } else {
            setUnreadStartIndex(null);
            scrollToUnread.current = false;
          }
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

  function handleDisplayNameChange(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      userChannel
        .push('update_display_name', { display_name: name })
        .receive('ok', () => { setDisplayName(name); resolve(); })
        .receive('error', () => reject(new Error('Failed to update display name')));
    });
  }

  function handleDisconnect() {
    disconnect();
    onDisconnect();
  }

  return (
    <SidebarProvider className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <ChatSidebar
        serverName={serverName}
        username={username}
        displayName={displayName}
        channels={channels}
        unread={unread}
        activeChannelId={activeChannel?.id}
        onJoinChannel={joinChannel}
        onDisplayNameChange={handleDisplayNameChange}
        onDisconnect={handleDisconnect}
      />

      <SidebarInset className="overflow-hidden">
        {activeChannel ? (
          <>
            <header className="flex items-center gap-2 border-b px-4 h-12 shrink-0 select-none">
              <span className="text-muted-foreground">#</span>
              <span className="font-semibold text-sm">{activeChannel.name}</span>
            </header>

            <MessageList
              messages={messages}
              unreadStartIndex={unreadStartIndex}
              messagesEndRef={messagesEndRef}
              dividerRef={dividerRef}
            />

            <MessageInput
              value={input}
              channelName={activeChannel.name}
              onChange={setInput}
              onSubmit={sendMessage}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a channel to start chatting
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
