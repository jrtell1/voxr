import { useEffect, useRef, type RefObject } from 'react';
import type { Message, ChatUser } from '../../types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import UserPopover from './UserPopover';

interface Props {
  messages: Message[];
  unreadStartIndex: number | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  dividerRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  currentUsername: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPoke: (userId: number) => void;
  onOpenDm: (user: ChatUser) => void;
}

export default function MessageList({
  messages,
  unreadStartIndex,
  messagesEndRef,
  dividerRef,
  scrollContainerRef,
  currentUsername,
  hasMore,
  loadingMore,
  onLoadMore,
  onPoke,
  onOpenDm,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMoreRef.current) {
        onLoadMoreRef.current();
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-4 px-1 flex flex-col gap-0.5 select-text">
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-2">
          {loadingMore && <Spinner />}
        </div>
      )}
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
              <UserPopover user={msg.user} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
                <button className="mt-0.5 shrink-0 cursor-pointer no-drag-region">
                  <Avatar size="default">
                    <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </button>
              </UserPopover>
              <div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <UserPopover user={msg.user} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
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
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
