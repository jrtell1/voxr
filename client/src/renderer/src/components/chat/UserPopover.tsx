import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { ChatUser } from '../../types';

interface Props {
  user: ChatUser;
  isSelf: boolean;
  onPoke: (userId: number) => void;
  onOpenDm: (user: ChatUser) => void;
  children: ReactNode;
}

export default function UserPopover({ user, isSelf, onPoke, onOpenDm, children }: Props) {
  const visibleName = user.display_name ?? user.username;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-4" side="right" align="start">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="size-16 text-xl">
            <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="font-semibold">{visibleName}</span>
            {user.display_name && user.display_name !== user.username && (
              <span className="text-xs text-muted-foreground">@{user.username}</span>
            )}
          </div>
          {!isSelf && (
            <div className="flex flex-col gap-2 w-full">
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onOpenDm(user)}>
                Message
              </Button>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onPoke(user.id)}>
                Poke
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
