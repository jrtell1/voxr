import type { RefObject } from 'react';
import type { Message } from '../../types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserPopover from './UserPopover';

interface Props {
  messages: Message[];
  unreadStartIndex: number | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  dividerRef: RefObject<HTMLDivElement | null>;
  currentUsername: string;
  onPoke: (userId: number) => void;
  onOpenDm: (userId: number) => void;
}

export default function MessageList({ messages, unreadStartIndex, messagesEndRef, dividerRef, currentUsername, onPoke, onOpenDm }: Props) {
  return (
    <div className="flex-1 overflow-y-auto py-4 px-1 flex flex-col gap-0.5 select-text">
      {messages.map((msg, i) => {
        const visibleName = msg.user.display_name ?? msg.user.username;
        const isSelf = msg.user.username === currentUsername;
        return (
          <div key={msg.id ?? i}>
            {i === unreadStartIndex && (
              <div ref={dividerRef} className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-destructive/60" />
                <span className="text-xs font-semibold text-destructive shrink-0">New messages</span>
                <div className="flex-1 h-px bg-destructive/60" />
              </div>
            )}
            <div className="flex gap-3 px-2 py-1 rounded-md hover:bg-muted/40 items-start">
              <UserPopover userId={msg.user.id} username={msg.user.username} displayName={msg.user.display_name} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
                <button className="mt-0.5 shrink-0 cursor-pointer no-drag-region">
                  <Avatar size="default">
                    <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </UserPopover>
              <div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <UserPopover userId={msg.user.id} username={msg.user.username} displayName={msg.user.display_name} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
                    <button className="font-semibold text-sm cursor-pointer hover:underline no-drag-region">
                      {visibleName}
                    </button>
                  </UserPopover>
                  <span className="text-xs text-muted-foreground">{formatTime(msg.inserted_at)}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
