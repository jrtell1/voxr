import { useEffect, useRef } from 'react';
import { useSelector } from '@tanstack/react-store';
import { disconnect } from '@/socket';
import { getLastChannel } from '@/lib/storage';
import type { Session } from '@/types';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import ChatSidebar from './chat/ChatSidebar';
import MessageArea from './chat/MessageArea';
import UserList from './chat/UserList';
import { chatStore } from '@/stores/chatStore';
import { serverStore } from '@/stores/serverStore';
import { initChat, joinChannel, cleanupChat } from '@/lib/chatActions';
import { initServer, cleanupServer } from '@/lib/serverActions';
import { initVoice, cleanupVoice } from '@/lib/voiceActions';
import { initCustomEmojis } from '@/lib/customEmojiActions';

interface Props {
  session: Session;
  onDisconnect: () => void;
}

// Draws the small red dot used as the taskbar overlay icon (Windows) and
// returns it as a data URL. macOS/Linux ignore the image and just show a badge.
function makeBadgeIcon(): string {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();
  return canvas.toDataURL('image/png');
}

export default function Chat({ session, onDisconnect }: Props) {
  const { socket, userChannel, serverUrl, serverName, username, channels: initialChannels, initialUnread } = session;

  const activeView = useSelector(chatStore, (s) => s.activeView);
  const pokeFrom = useSelector(serverStore, (s) => s.pokeFrom);
  const unread = useSelector(serverStore, (s) => s.unread);

  useEffect(() => {
    if (!activeView) {
      document.title = serverName;
      return;
    }
    if (activeView.type === 'channel') {
      document.title = `#${activeView.channel.name} - ${serverName}`;
    } else if (activeView.type === 'dm') {
      const name = activeView.dmChannel.other_user.display_name ?? activeView.dmChannel.other_user.username;
      document.title = `@${name} - ${serverName}`;
    } else {
      document.title = serverName;
    }
  }, [activeView, serverName]);

  const prevHasUnreadRef = useRef<boolean | null>(null);
  useEffect(() => {
    // unread counts change on every incoming message; the badge only depends
    // on whether *anything* is unread. Re-pushing the overlay icon on each
    // count change rebuilds a native image + crosses IPC needlessly (and leaks
    // native overlay bitmaps under load), so only act when the boolean flips.
    const hasUnread = Object.values(unread).some((c) => c > 0);
    if (hasUnread === prevHasUnreadRef.current) return;
    prevHasUnreadRef.current = hasUnread;
    window.electron?.setBadge(hasUnread ? makeBadgeIcon() : null);
  }, [unread]);

  useEffect(() => {
    const serverChannel = initServer(
      socket, userChannel, initialUnread, session.dmChannels,
      session.displayName, initialChannels, session.isAdmin,
    );
    initChat(socket, userChannel, serverUrl, session.token, username);
    initVoice(serverChannel);
    initCustomEmojis(serverUrl, session.token);

    const lastChannelId = getLastChannel(serverUrl);
    if (lastChannelId) {
      const channel = initialChannels.find((c) => c.id === lastChannelId && c.type === 'text');
      if (channel) joinChannel(channel);
    }

    return () => {
      cleanupChat();
      cleanupServer();
      cleanupVoice();
      window.electron?.setBadge(null);
    };
  }, []);

  function handleDisconnect() {
    cleanupVoice();
    cleanupChat();
    cleanupServer();
    disconnect();
    onDisconnect();
  }

  const dmTargetUser =
    activeView?.type === 'dm' ? activeView.dmChannel.other_user :
    activeView?.type === 'pending_dm' ? activeView.targetUser : null;

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
            <MessageArea username={username} userId={session.userId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a channel to start chatting
            </div>
          )}

          {activeView?.type !== 'dm' && activeView?.type !== 'pending_dm' && (
            <UserList username={username} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
