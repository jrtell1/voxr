import { useState, useEffect, useRef, FormEvent } from 'react';
import { Channel as PhxChannel } from 'phoenix';
import { disconnect } from '../socket';
import type { Session, Channel, Message } from '../types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';
import { LogOutIcon } from 'lucide-react';

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
    messagesEndRef.current?.scrollIntoView();
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
    <SidebarProvider className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <Sidebar collapsible="none">
        <SidebarHeader className="border-b px-4 py-3">
          <span className="font-bold text-sm truncate">{serverName}</span>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Text Channels</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {channels.map((ch) => {
                  const count = unread[ch.id] ?? 0;
                  const isActive = activeChannel?.id === ch.id;
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <SidebarMenuButton isActive={isActive} onClick={() => joinChannel(ch)}>
                        <span className="text-muted-foreground">#</span>
                        <span>{ch.name}</span>
                      </SidebarMenuButton>
                      {count > 0 && !isActive && (
                        <SidebarMenuBadge>{count > 99 ? '99+' : count}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar size="sm">
              <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-sm truncate">{username}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" onClick={handleDisconnect}>
                  <LogOutIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Disconnect</TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="overflow-hidden">
        {activeChannel ? (
          <>
            <header className="flex items-center gap-2 border-b px-4 py-3 shrink-0 select-none">
              <span className="text-muted-foreground">#</span>
              <span className="font-semibold text-sm">{activeChannel.name}</span>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-0.5 select-text">
              {messages.map((msg, i) => (
                <div key={msg.id ?? i} className="flex gap-3 px-2 py-1 rounded-md hover:bg-muted/40">
                  <Avatar size="sm" className="mt-0.5 shrink-0">
                    <AvatarFallback>{msg.user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{msg.user.display_name ?? msg.user.username}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(msg.inserted_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-2 p-4 shrink-0 border-t">
              <div className="relative flex-1">
                <Input
                  className="h-11 pr-14 px-3"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  autoFocus
                />
                <Kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 text-sm">↵</Kbd>
              </div>
            </form>
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
