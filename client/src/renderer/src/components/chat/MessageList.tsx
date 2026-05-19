import type { RefObject } from 'react';
import type { Message } from '../../types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Props {
  messages: Message[];
  unreadStartIndex: number | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  dividerRef: RefObject<HTMLDivElement | null>;
}

export default function MessageList({ messages, unreadStartIndex, messagesEndRef, dividerRef }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-0.5 select-text">
      {messages.map((msg, i) => (
        <div key={msg.id ?? i}>
          {i === unreadStartIndex && (
            <div ref={dividerRef} className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-destructive/60" />
              <span className="text-xs font-semibold text-destructive shrink-0">New messages</span>
              <div className="flex-1 h-px bg-destructive/60" />
            </div>
          )}
          <div className="flex gap-3 px-2 py-1 rounded-md hover:bg-muted/40">
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
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
