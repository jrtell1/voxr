import React, { useEffect, useRef, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { useSelector } from '@tanstack/react-store';
import type { Message, ChatUser, CustomEmoji } from '../../types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import UserPopover from './UserPopover';
import { customEmojiStore } from '@/stores/customEmojiStore';
import { sendReaction } from '@/lib/chatActions';
import { searchEmoji } from '@/lib/emoji';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface Props {
  messages: Message[];
  unreadStartIndex: number | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  dividerRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  currentUsername: string;
  currentUserId: number;
  serverUrl: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPoke: (userId: number) => void;
  onOpenDm: (user: ChatUser) => void;
  editingMessageId: number | null;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (messageId: number, content: string) => Promise<void>;
}

export default function MessageList({
  messages,
  unreadStartIndex,
  messagesEndRef,
  dividerRef,
  scrollContainerRef,
  currentUsername,
  currentUserId,
  serverUrl,
  hasMore,
  loadingMore,
  onLoadMore,
  onPoke,
  onOpenDm,
  editingMessageId,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;
  const customEmojis = useSelector(customEmojiStore, (s) => s.emojis);
  const customEmojiMap = useMemo(
    () => new Map(customEmojis.map((e) => [e.shortcode, e])),
    [customEmojis]
  );

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
        const isGrouped = i > 0
          && messages[i - 1].user.username === msg.user.username
          && i !== unreadStartIndex;
        return (
          <div key={msg.id ?? i}>
            {i === unreadStartIndex && (
              <div ref={dividerRef} className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-destructive/60" />
                <span className="text-xs font-semibold text-destructive shrink-0">New messages</span>
                <div className="flex-1 h-px bg-destructive/60" />
              </div>
            )}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className={`group/msg flex gap-3 px-2 rounded-md hover:bg-muted/40 items-start ${isGrouped ? 'py-0.5' : 'py-1'}`} style={{ userSelect: 'text' }}>
                  {isGrouped
                    ? <span className="w-8 shrink-0 text-right text-[10px] leading-5 text-muted-foreground/0 group-hover/msg:text-muted-foreground transition-colors mt-0.5">{formatTimeShort(msg.inserted_at)}</span>
                    : (
                      <UserPopover user={msg.user} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
                        <button className="mt-0.5 shrink-0 cursor-pointer no-drag-region" style={{ userSelect: 'none' }}>
                          <Avatar size="default">
                            <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </button>
                      </UserPopover>
                    )
                  }
                  <div className="min-w-0 flex-1">
                    {!isGrouped && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <UserPopover user={msg.user} isSelf={isSelf} onPoke={onPoke} onOpenDm={onOpenDm}>
                          <button className="font-semibold text-sm cursor-pointer hover:underline no-drag-region" style={{ userSelect: 'none' }}>
                            {visibleName}
                          </button>
                        </UserPopover>
                        <span className="text-xs text-muted-foreground">{formatTime(msg.inserted_at)}</span>
                      </div>
                    )}
                    {msg.id === editingMessageId ? (
                      <InlineEditInput
                        initialContent={msg.content}
                        messageId={msg.id}
                        onSubmit={onSubmitEdit}
                        onCancel={onCancelEdit}
                      />
                    ) : (
                      msg.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {renderContent(msg.content, customEmojiMap)}
                          {msg.is_edited && <span className="text-xs text-muted-foreground ml-1">(edited)</span>}
                        </p>
                      )
                    )}
                    {msg.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.attachments.map((a, i) => {
                          const src = `${serverUrl}${a.url}`;
                          const imgClass = 'max-h-60 max-w-xs rounded-md border object-contain hover:opacity-90 transition-opacity';
                          return (
                            <a key={i} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                              <img src={src} alt={a.filename} className={imgClass} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {msg.reactions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5" style={{ userSelect: 'none' }}>
                        {msg.reactions.map((r) => {
                          const isOwn = r.user_ids.includes(currentUserId);
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => sendReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1 text-xs px-1 py-0.5 rounded-md border transition-colors cursor-pointer ${
                                isOwn
                                  ? 'bg-primary/20 border-primary/40 hover:bg-primary/30'
                                  : 'bg-muted/40 border-border hover:bg-muted'
                              }`}
                            >
                              {renderReactionEmoji(r.emoji, customEmojiMap)}
                              <span>{r.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {msg.user.id === currentUserId && (
                  <ContextMenuItem onClick={() => onStartEdit(msg)}>
                    Edit
                  </ContextMenuItem>
                )}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>React</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="p-0 overflow-hidden">
                    <EmojiReactionPicker onSelect={(emoji) => sendReaction(msg.id, emoji)} />
                  </ContextMenuSubContent>
                </ContextMenuSub>
                {msg.content && (
                  <ContextMenuItem onClick={() => copyText(msg.content)}>
                    Copy text
                  </ContextMenuItem>
                )}
                {msg.attachments?.map((a, i) => (
                  <ContextMenuItem key={i} onClick={() => copyText(`${serverUrl}${a.url}`)}>
                    {msg.attachments.length > 1 ? `Copy image URL ${i + 1}` : 'Copy image URL'}
                  </ContextMenuItem>
                ))}
              </ContextMenuContent>
            </ContextMenu>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

function InlineEditInput({ initialContent, messageId, onSubmit, onCancel }: {
  initialContent: string;
  messageId: number;
  onSubmit: (messageId: number, content: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  async function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = value.trim();
      if (!content || saving) return;
      setSaving(true);
      try { await onSubmit(messageId, content); } finally { setSaving(false); }
    }
  }

  return (
    <div className="mt-0.5">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        rows={1}
        className="w-full text-sm leading-relaxed bg-muted/60 border border-border rounded-md px-2 py-1.5 resize-none overflow-hidden outline-none focus:ring-1 focus:ring-ring"
      />
      <p className="text-xs text-muted-foreground mt-0.5">escape to cancel · enter to save</p>
    </div>
  );
}

const POPULAR_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥', '✅', '👀', '🙏', '💯', '🤔', '😊'];

function EmojiReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [query, setQuery] = useState('');
  const customEmojis = useSelector(customEmojiStore, (s) => s.emojis);

  const items = useMemo(() => {
    const q = query.trim();
    if (!q) return POPULAR_EMOJIS.map((native) => ({ kind: 'standard' as const, shortcode: '', native }));
    return searchEmoji(q, customEmojis, 24);
  }, [query, customEmojis]);

  return (
    <div className="p-2 w-60" onKeyDown={(e) => e.stopPropagation()}>
      <input
        className="w-full text-xs border rounded px-2 py-1 mb-2 bg-background outline-none focus:ring-1 focus:ring-ring"
        placeholder="Search emoji..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="grid grid-cols-8 gap-0.5">
        {items.map((e, i) => (
          <button
            key={i}
            className="text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-muted cursor-pointer"
            onClick={() => onSelect(e.kind === 'standard' ? e.native : `:${e.shortcode}:`)}
          >
            {e.kind === 'standard'
              ? e.native
              : <img src={(e as { url: string }).url} className="w-5 h-5 object-contain" alt={e.shortcode} />
            }
          </button>
        ))}
      </div>
    </div>
  );
}

function renderReactionEmoji(emoji: string, emojiMap: Map<string, CustomEmoji>): React.ReactNode {
  if (emoji.startsWith(':') && emoji.endsWith(':')) {
    const shortcode = emoji.slice(1, -1);
    const custom = emojiMap.get(shortcode);
    if (custom) {
      return <img src={custom.url} className="w-4 h-4 object-contain inline" alt={emoji} />;
    }
    return emoji;
  }
  return emoji;
}

function copyText(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function renderContent(text: string, emojiMap: Map<string, CustomEmoji>): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /:([a-z0-9_]+):/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const emoji = emojiMap.get(match[1]);
    if (emoji) {
      parts.push(
        <img
          key={key++}
          src={emoji.url}
          alt={`:${emoji.shortcode}:`}
          title={`:${emoji.shortcode}:`}
          className="inline-block h-5 w-auto align-middle mx-0.5"
        />
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (date >= todayStart) return time;
  if (date >= yesterdayStart) return `yesterday at ${time}`;

  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
}
