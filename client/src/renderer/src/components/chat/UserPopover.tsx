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
  children: ReactNode;
}

export default function UserPopover({ userId, username, displayName, isSelf, onPoke, children }: Props) {
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
            <Button size="sm" variant="secondary" className="w-full" onClick={() => onPoke(userId)}>
              Poke
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
