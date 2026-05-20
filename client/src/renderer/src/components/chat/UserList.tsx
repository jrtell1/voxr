import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface PresenceUser {
  id: string;
  username: string;
  displayName: string | null;
}

interface Props {
  onlineUsers: PresenceUser[];
  offlineUsers: PresenceUser[];
}

function UserRow({ user, online }: { user: PresenceUser; online: boolean }) {
  const visibleName = user.displayName ?? user.username;
  return (
    <div className="flex items-center gap-2 px-1 py-1 rounded-md">
      <div className="relative shrink-0">
        <Avatar size="sm" className={online ? '' : 'opacity-40'}>
          <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 ring-1 ring-background" />
        )}
      </div>
      <div className={`flex flex-col min-w-0 ${online ? '' : 'opacity-40'}`}>
        <span className="text-sm truncate">{visibleName}</span>
        {user.displayName && user.displayName !== user.username && (
          <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
        )}
      </div>
    </div>
  );
}

export default function UserList({ onlineUsers, offlineUsers }: Props) {
  return (
    <aside className="w-48 border-l flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 h-12 flex items-center border-b shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Members
        </span>
      </div>

      <div className="flex flex-col p-2">
        {onlineUsers.length > 0 && (
          <>
            <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Online — {onlineUsers.length}
            </p>
            {onlineUsers.map((user) => (
              <UserRow key={user.id} user={user} online />
            ))}
          </>
        )}

        {offlineUsers.length > 0 && (
          <>
            <p className={`px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${onlineUsers.length > 0 ? 'mt-3' : ''}`}>
              Offline — {offlineUsers.length}
            </p>
            {offlineUsers.map((user) => (
              <UserRow key={user.id} user={user} online={false} />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
