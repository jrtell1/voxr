import type { Channel } from '../../types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOutIcon } from 'lucide-react';

interface Props {
  serverName: string;
  username: string;
  channels: Channel[];
  unread: Record<number, number>;
  activeChannelId: number | undefined;
  onJoinChannel: (channel: Channel) => void;
  onDisconnect: () => void;
}

export default function ChatSidebar({
  serverName,
  username,
  channels,
  unread,
  activeChannelId,
  onJoinChannel,
  onDisconnect,
}: Props) {
  return (
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
                const isActive = ch.id === activeChannelId;
                return (
                  <SidebarMenuItem key={ch.id}>
                    <SidebarMenuButton isActive={isActive} onClick={() => onJoinChannel(ch)}>
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
              <Button variant="ghost" size="icon-sm" onClick={onDisconnect}>
                <LogOutIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Disconnect</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
