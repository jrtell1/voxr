import { memo, useMemo } from 'react';
import { useSelector } from '@tanstack/react-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import UserPopover from './UserPopover';
import { chatStore } from '../../stores/chatStore';
import { serverStore } from '../../stores/serverStore';
import { sendPoke, openDm } from '../../lib/chatActions';
import type { ChatUser } from '../../types';

export interface PresenceUser {
  id: string;
  userId: number;
  username: string;
  displayName: string | null;
}

interface Props {
  username: string;
}

const UserRow = memo(function UserRow({ user, online, currentUsername }: {
  user: PresenceUser;
  online: boolean;
  currentUsername: string;
}) {
  const visibleName = user.displayName ?? user.username;
  const isSelf = user.username === currentUsername;
  const chatUser: ChatUser = { id: user.userId, username: user.username, display_name: user.displayName };

  return (
    <SidebarMenuItem>
      <UserPopover user={chatUser} isSelf={isSelf} onPoke={sendPoke} onOpenDm={openDm}>
        <SidebarMenuButton className={`no-drag-region ${online ? '' : 'opacity-50'}`}>
          <div className="relative shrink-0">
            <Avatar size="sm">
              <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            {online && (
              <span className="absolute bottom-0 right-0 size-1.5 rounded-full bg-green-500 ring-1 ring-sidebar" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate">{visibleName}</span>
            {user.displayName && user.displayName !== user.username && (
              <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
            )}
          </div>
        </SidebarMenuButton>
      </UserPopover>
    </SidebarMenuItem>
  );
}, (a, b) =>
  a.online === b.online &&
  a.currentUsername === b.currentUsername &&
  a.user.id === b.user.id &&
  a.user.username === b.user.username &&
  a.user.displayName === b.user.displayName,
);

export default function UserList({ username }: Props) {
  const presences = useSelector(serverStore, (s) => s.presences);
  const allUsers = useSelector(chatStore, (s) => s.allUsers);

  const onlineUsers = useMemo<PresenceUser[]>(() =>
    Object.entries(presences).map(([id, { metas }]) => ({
      id,
      userId: parseInt(id, 10),
      username: metas[0].username,
      displayName: metas[0].display_name,
    })),
  [presences]);

  const offlineUsers = useMemo(() => {
    const onlineIds = new Set(onlineUsers.map((u) => u.id));
    return allUsers.filter((u) => !onlineIds.has(u.id));
  }, [onlineUsers, allUsers]);

  return (
    <aside className="w-56 border-l flex flex-col shrink-0 overflow-y-auto">
      {onlineUsers.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Online — {onlineUsers.length}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {onlineUsers.map((user) => (
                <UserRow key={user.id} user={user} online currentUsername={username} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
      {offlineUsers.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Offline — {offlineUsers.length}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {offlineUsers.map((user) => (
                <UserRow key={user.id} user={user} online={false} currentUsername={username} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </aside>
  );
}
