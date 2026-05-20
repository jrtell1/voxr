import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface PresenceUser {
  id: string;
  username: string;
  displayName: string | null;
}

interface Props {
  users: PresenceUser[];
}

export default function UserList({ users }: Props) {
  return (
    <aside className="w-48 border-l flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 h-12 flex items-center border-b shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Online — {users.length}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        {users.map((user) => {
          const visibleName = user.displayName ?? user.username;
          return (
            <div key={user.id} className="flex items-center gap-2 px-1 py-1 rounded-md">
              <div className="relative shrink-0">
                <Avatar size="sm">
                  <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 ring-1 ring-background" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm truncate">{visibleName}</span>
                {user.displayName && user.displayName !== user.username && (
                  <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
