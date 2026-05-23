import { useEffect } from 'react';
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

interface Props {
  session: Session;
  onDisconnect: () => void;
}

export default function Chat({ session, onDisconnect }: Props) {
  const { socket, userChannel, serverUrl, serverName, username, channels: allChannels, initialUnread } = session;
  const textChannels = allChannels.filter((c) => c.type === 'text');
  const voiceChannels = allChannels.filter((c) => c.type === 'voice');

  const activeView = useSelector(chatStore, (s) => s.activeView);
  const pokeFrom = useSelector(serverStore, (s) => s.pokeFrom);

  useEffect(() => {
    const serverChannel = initServer(socket, userChannel, initialUnread, session.dmChannels, session.displayName);
    initChat(socket, userChannel, serverUrl);
    initVoice(serverChannel);

    const lastChannelId = getLastChannel(serverUrl);
    if (lastChannelId) {
      const channel = textChannels.find((c) => c.id === lastChannelId);
      if (channel) joinChannel(channel);
    }

    return () => {
      cleanupChat();
      cleanupServer();
      cleanupVoice();
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
        textChannels={textChannels}
        voiceChannels={voiceChannels}
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
            <MessageArea username={username} />
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
