import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserPopover from './UserPopover';

export interface PresenceUser {
  id: string;
  userId: number;
  username: string;
  displayName: string | null;
}

interface Props {
  onlineUsers: PresenceUser[];
  offlineUsers: PresenceUser[];
  currentUsername: string;
  onPoke: (userId: number) => void;
}

function UserRow({ user, online, currentUsername, onPoke }: { user: PresenceUser; online: boolean; currentUsername: string; onPoke: (userId: number) => void }) {
  const visibleName = user.displayName ?? user.username;
  const isSelf = user.username === currentUsername;

  return (
    <UserPopover userId={user.userId} username={user.username} displayName={user.displayName} isSelf={isSelf} onPoke={onPoke}>
      <button className="flex items-center gap-2 px-1 py-1 rounded-md w-full hover:bg-accent text-left cursor-pointer no-drag-region">
        <div className="relative shrink-0">
          <Avatar size="default" className={online ? '' : 'opacity-40'}>
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
      </button>
    </UserPopover>
  );
}

export default function UserList({ onlineUsers, offlineUsers, currentUsername, onPoke }: Props) {
  return (
    <aside className="w-64 border-l flex flex-col shrink-0 overflow-y-auto">
      <div className="flex flex-col p-2">
        {onlineUsers.length > 0 && (
          <>
            <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Online — {onlineUsers.length}
            </p>
            {onlineUsers.map((user) => (
              <UserRow key={user.id} user={user} online currentUsername={currentUsername} onPoke={onPoke} />
            ))}
          </>
        )}

        {offlineUsers.length > 0 && (
          <>
            <p className={`px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${onlineUsers.length > 0 ? 'mt-3' : ''}`}>
              Offline — {offlineUsers.length}
            </p>
            {offlineUsers.map((user) => (
              <UserRow key={user.id} user={user} online={false} currentUsername={currentUsername} onPoke={onPoke} />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
