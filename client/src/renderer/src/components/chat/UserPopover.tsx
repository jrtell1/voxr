import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface Props {
  userId: number;
  username: string;
  displayName: string | null;
  isSelf: boolean;
  onPoke: (userId: number) => void;
  onOpenDm: (userId: number) => void;
  children: ReactNode;
}

export default function UserPopover({ userId, username, displayName, isSelf, onPoke, onOpenDm, children }: Props) {
  const visibleName = displayName ?? username;

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
            {displayName && displayName !== username && (
              <span className="text-xs text-muted-foreground">@{username}</span>
            )}
          </div>
          {!isSelf && (
            <div className="flex flex-col gap-2 w-full">
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onOpenDm(userId)}>
                Message
              </Button>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => onPoke(userId)}>
                Poke
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
