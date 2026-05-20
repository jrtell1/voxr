import { useState, useEffect, useRef } from 'react';
import { Channel as PhxChannel, Presence } from 'phoenix';
import { disconnect } from '../socket';
import { getShakeEnabled, getSoundEnabled, saveLastChannel, getLastChannel } from '../lib/storage';
import type { Session, Channel, DmChannel, ActiveView, Message, ChatUser } from '../types';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import ChatSidebar from './chat/ChatSidebar';
import MessageList from './chat/MessageList';
import MessageInput from './chat/MessageInput';
import TypingIndicator from './chat/TypingIndicator';
import UserList, { type PresenceUser } from './chat/UserList';

interface Props {
  session: Session;
  onDisconnect: () => void;
}

export default function Chat({ session, onDisconnect }: Props) {
  const { socket, userChannel, serverName, username, channels, initialUnread, serverUrl } = session;
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState<Record<number, number>>(initialUnread);
  const [displayName, setDisplayName] = useState<string | null>(session.displayName);
  const [unreadStartIndex, setUnreadStartIndex] = useState<number | null>(null);
  const [presences, setPresences] = useState<Record<string, { metas: { username: string; display_name: string | null }[] }>>({});
  const [allUsers, setAllUsers] = useState<PresenceUser[]>([]);
  const [dmChannels, setDmChannels] = useState<DmChannel[]>(session.dmChannels);
  const [pokeFrom, setPokeFrom] = useState<string | null>(null);
  const channelRef = useRef<PhxChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const scrollToUnread = useRef(false);
  const lastPokeSoundRef = useRef(0);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const typingTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    userChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
      setUnread((prev) => ({ ...prev, [channel_id]: count }));
    });

    userChannel.on('dm_channel_opened', ({ channel_id, other_user }: { channel_id: number; other_user: ChatUser }) => {
      const dmChannel: DmChannel = { id: channel_id, other_user };
      setDmChannels((prev) => (prev.some((d) => d.id === channel_id) ? prev : [...prev, dmChannel]));
    });

    userChannel.on('poke', ({ from_display_name, from_username }: { from_id: number; from_username: string; from_display_name: string | null }) => {
      const name = from_display_name ?? from_username;
      setPokeFrom(name);
      setTimeout(() => setPokeFrom(null), 4000);
      window.electron?.notify('Voxr', `${name} poked you!`);
      const now = Date.now();
      if (now - lastPokeSoundRef.current >= 60_000) {
        lastPokeSoundRef.current = now;
        if (getSoundEnabled()) playPokeSound();
      }
      if (getShakeEnabled()) window.electron?.shake();
    });

    const serverChannel = socket.channel('server:lobby');
    serverChannel.join();
    serverChannel.on('presence_state', (state) => {
      setPresences(Presence.syncState({}, state));
    });
    serverChannel.on('presence_diff', (diff) => {
      setPresences((prev) => Presence.syncDiff(prev, diff));
    });

    return () => {
      userChannel.off('unread_updated');
      userChannel.off('dm_channel_opened');
      userChannel.off('poke');
      serverChannel.leave();
    };
  }, [socket, userChannel]);

  useEffect(() => {
    const lastChannelId = getLastChannel(serverUrl);
    if (!lastChannelId) return;
    const channel = channels.find((c) => c.id === lastChannelId);
    if (channel) joinChannel(channel);
  }, []);

  useEffect(() => {
    if (scrollToUnread.current && dividerRef.current) {
      dividerRef.current.scrollIntoView();
      scrollToUnread.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [messages]);

  function switchPhxChannel(topic: string, onJoinOk: (data: Record<string, unknown>) => void) {
    const doJoin = () => {
      const phxChannel = socket.channel(topic);

      phxChannel
        .join()
        .receive('ok', onJoinOk)
        .receive('error', (err: unknown) => console.error('Join error', err));

      phxChannel.on('new_message', (msg: Message) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      });

      phxChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
        setUnread((prev) => ({ ...prev, [channel_id]: count }));
      });

      phxChannel.on('typing', ({ user_id, name }: { user_id: number; name: string }) => {
        const timeouts = typingTimeoutsRef.current;
        const existing = timeouts.get(user_id);
        if (existing) clearTimeout(existing);

        setTypingUsers((prev) => new Map(prev).set(user_id, name));

        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(user_id);
            return next;
          });
          timeouts.delete(user_id);
        }, 3000);

        timeouts.set(user_id, timeout);
      });

      channelRef.current = phxChannel;
    };

    if (channelRef.current) {
      const old = channelRef.current;
      channelRef.current = null;
      old.off('new_message');
      old.off('unread_updated');
      old.off('typing');
      typingTimeoutsRef.current.forEach(clearTimeout);
      typingTimeoutsRef.current.clear();
      setTypingUsers(new Map());
      setAllUsers([]);
      old.leave().receive('ok', doJoin);
    } else {
      doJoin();
    }
  }

  function joinChannel(channel: Channel) {
    switchPhxChannel(`room:${channel.id}`, ({ messages: history, users }) => {
      const history_ = history as Message[];
      const users_ = users as { id: number; username: string; display_name: string | null }[];
      const unreadCount = unread[channel.id] ?? 0;
      setMessages(history_);
      setActiveView({ type: 'channel', channel });
      setAllUsers(users_.map((u) => ({ id: String(u.id), userId: u.id, username: u.username, displayName: u.display_name })));
      saveLastChannel(serverUrl, channel.id);
      setUnread((prev) => ({ ...prev, [channel.id]: 0 }));
      if (unreadCount > 0 && history_.length > 0) {
        setUnreadStartIndex(Math.max(0, history_.length - unreadCount));
        scrollToUnread.current = true;
      } else {
        setUnreadStartIndex(null);
        scrollToUnread.current = false;
      }
    });
  }

  function joinDmChannel(dmChannel: DmChannel) {
    switchPhxChannel(`room:${dmChannel.id}`, ({ messages: history }) => {
      const history_ = history as Message[];
      const unreadCount = unread[dmChannel.id] ?? 0;
      setMessages(history_);
      setActiveView({ type: 'dm', dmChannel });
      setUnread((prev) => ({ ...prev, [dmChannel.id]: 0 }));
      if (unreadCount > 0 && history_.length > 0) {
        setUnreadStartIndex(Math.max(0, history_.length - unreadCount));
        scrollToUnread.current = true;
      } else {
        setUnreadStartIndex(null);
        scrollToUnread.current = false;
      }
    });
  }

  function handleOpenDm(targetUser: ChatUser) {
    const existing = dmChannels.find((d) => d.other_user.id === targetUser.id);
    if (existing) {
      joinDmChannel(existing);
      return;
    }

    if (channelRef.current) {
      const old = channelRef.current;
      channelRef.current = null;
      old.off('new_message');
      old.off('unread_updated');
      setAllUsers([]);
      old.leave();
    }

    setMessages([]);
    setActiveView({ type: 'pending_dm', targetUser });
  }

  function sendTyping() {
    channelRef.current?.push('typing', {});
  }

  function sendMessage() {
    const content = input.trim();
    if (!content) return;

    if (activeView?.type === 'pending_dm') {
      const targetUser = activeView.targetUser;
      setInput('');
      userChannel
        .push('open_dm', { user_id: targetUser.id })
        .receive('ok', ({ channel_id, other_user }: { channel_id: number; other_user: ChatUser }) => {
          const dmChannel: DmChannel = { id: channel_id, other_user };
          setDmChannels((prev) => (prev.some((d) => d.id === channel_id) ? prev : [...prev, dmChannel]));
          switchPhxChannel(`room:${channel_id}`, ({ messages: history }) => {
            setMessages(history as Message[]);
            setActiveView({ type: 'dm', dmChannel });
            setUnreadStartIndex(null);
            scrollToUnread.current = false;
            channelRef.current?.push('send_message', { content });
          });
        });
      return;
    }

    if (!channelRef.current) return;
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

  function handlePoke(userId: number) {
    userChannel.push('poke', { user_id: userId });
  }

  const onlineUsers: PresenceUser[] = Object.entries(presences).map(([id, { metas }]) => ({
    id,
    userId: parseInt(id, 10),
    username: metas[0].username,
    displayName: metas[0].display_name,
  }));

  const onlineIds = new Set(onlineUsers.map((u) => u.id));
  const offlineUsers = allUsers.filter((u) => !onlineIds.has(u.id));

  const dmTargetUser =
    activeView?.type === 'dm' ? activeView.dmChannel.other_user :
    activeView?.type === 'pending_dm' ? activeView.targetUser : null;

  const messageLabel =
    activeView?.type === 'channel' ? `#${activeView.channel.name}` :
    dmTargetUser ? `@${dmTargetUser.display_name ?? dmTargetUser.username}` :
    '';

  return (
    <SidebarProvider className="flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
      {pokeFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-lg px-4 py-2.5 shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          👉 <span className="font-semibold">{pokeFrom}</span> poked you!
        </div>
      )}
      <ChatSidebar
        serverName={serverName}
        username={username}
        displayName={displayName}
        channels={channels}
        dmChannels={dmChannels}
        unread={unread}
        activeView={activeView}
        onJoinChannel={joinChannel}
        onJoinDm={joinDmChannel}
        onDisplayNameChange={handleDisplayNameChange}
        onDisconnect={handleDisconnect}
      />

      <SidebarInset className="overflow-hidden flex flex-col">
        {activeView && (
          <header className="flex items-center gap-2 border-b px-4 h-12 shrink-0 select-none">
            {activeView.type === 'channel' ? (
              <>
                <span className="text-muted-foreground">#</span>
                <span className="font-semibold text-sm">{activeView.channel.name}</span>
              </>
            ) : dmTargetUser ? (
              <>
                <span className="text-muted-foreground">@</span>
                <span className="font-semibold text-sm">
                  {dmTargetUser.display_name ?? dmTargetUser.username}
                </span>
              </>
            ) : null}
          </header>
        )}

        <div className="flex flex-row flex-1 min-h-0 overflow-hidden">
          {activeView ? (
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <MessageList
                messages={messages}
                unreadStartIndex={unreadStartIndex}
                messagesEndRef={messagesEndRef}
                dividerRef={dividerRef}
                currentUsername={username}
                onPoke={handlePoke}
                onOpenDm={handleOpenDm}
              />

              <TypingIndicator names={[...typingUsers.values()]} />
              <MessageInput
                value={input}
                label={messageLabel}
                onChange={setInput}
                onSubmit={sendMessage}
                onTyping={sendTyping}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a channel to start chatting
            </div>
          )}

          {activeView?.type !== 'dm' && activeView?.type !== 'pending_dm' && (
            <UserList
              onlineUsers={onlineUsers}
              offlineUsers={offlineUsers}
              currentUsername={username}
              onPoke={handlePoke}
              onOpenDm={handleOpenDm}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function playPokeSound() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
  osc.onended = () => ctx.close();
}
