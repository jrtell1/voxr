import { useLayoutEffect, useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from '@tanstack/react-store';
import type { Message } from '@/types';
import { chatStore } from '@/stores/chatStore';
import { sendMessage, sendTyping, loadMoreMessages, sendPoke, openDm, editMessage, scrollFlags } from '@/lib/chatActions';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import MessageInput from './MessageInput';

interface Props {
  username: string;
  userId: number;
}

export default function MessageArea({ username, userId }: Props) {
  const messages = useSelector(chatStore, (s) => s.messages);
  const unreadStartIndex = useSelector(chatStore, (s) => s.unreadStartIndex);
  const typingUsers = useSelector(chatStore, (s) => s.typingUsers);
  const hasMore = useSelector(chatStore, (s) => s.hasMore);
  const loadingMore = useSelector(chatStore, (s) => s.loadingMore);
  const activeView = useSelector(chatStore, (s) => s.activeView);
  const serverUrl = useSelector(chatStore, (s) => s.serverUrl);

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToEndRef = useRef(false);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (scrollFlags.prevScrollHeight !== null && container) {
      container.scrollTop = container.scrollHeight - scrollFlags.prevScrollHeight;
      scrollFlags.prevScrollHeight = null;
      shouldScrollToEndRef.current = false;
      return;
    }
    if (scrollFlags.scrollToUnread && dividerRef.current) {
      dividerRef.current.scrollIntoView();
      scrollFlags.scrollToUnread = false;
      shouldScrollToEndRef.current = false;
    } else if (scrollFlags.atBottom) {
      // Only stick to the bottom if the user was already following the tail.
      // If they've scrolled up to read, leave their position alone.
      messagesEndRef.current?.scrollIntoView();
      shouldScrollToEndRef.current = true;
    } else {
      shouldScrollToEndRef.current = false;
    }
  }, [messages]);

  // Keep scrollFlags.atBottom in sync with the user's scroll position. It's
  // only updated by real scroll events (not content growth), so when a new
  // message arrives the value still reflects where the user actually is.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      scrollFlags.atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!shouldScrollToEndRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img')).filter((img) => !img.complete);
    if (imgs.length === 0) return;

    const handleLoad = () => {
      if (shouldScrollToEndRef.current) {
        messagesEndRef.current?.scrollIntoView();
      }
    };

    imgs.forEach((img) => img.addEventListener('load', handleLoad));
    return () => imgs.forEach((img) => img.removeEventListener('load', handleLoad));
  }, [messages]);

  useEffect(() => {
    setEditingMessageId(null);
  }, [activeView]);

  // Stable identities so memoized message rows don't re-render every time
  // MessageArea re-renders.
  const handleStartEdit = useCallback((msg: Message) => setEditingMessageId(msg.id), []);
  const handleCancelEdit = useCallback(() => setEditingMessageId(null), []);
  const handleSubmitEdit = useCallback(async (messageId: number, content: string) => {
    await editMessage(messageId, content);
    setEditingMessageId(null);
  }, []);

  function handleUpArrow() {
    const lastOwn = [...messages].reverse().find((m) => m.user.id === userId && m.content.trim() !== '');
    if (lastOwn) {
      setEditingMessageId(lastOwn.id);
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView());
    }
  }

  function handleLoadMore() {
    scrollFlags.prevScrollHeight = scrollContainerRef.current?.scrollHeight ?? null;
    loadMoreMessages();
  }

  const dmTargetUser =
    activeView?.type === 'dm' ? activeView.dmChannel.other_user :
    activeView?.type === 'pending_dm' ? activeView.targetUser : null;

  const messageLabel =
    activeView?.type === 'channel' ? `#${activeView.channel.name}` :
    dmTargetUser ? `@${dmTargetUser.display_name ?? dmTargetUser.username}` : '';

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      <MessageList
        messages={messages}
        unreadStartIndex={unreadStartIndex}
        messagesEndRef={messagesEndRef}
        dividerRef={dividerRef}
        scrollContainerRef={scrollContainerRef}
        currentUsername={username}
        currentUserId={userId}
        serverUrl={serverUrl}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
        onPoke={sendPoke}
        onOpenDm={openDm}
        editingMessageId={editingMessageId}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSubmitEdit={handleSubmitEdit}
      />
      <TypingIndicator names={[...typingUsers.values()]} />
      <MessageInput label={messageLabel} onSubmit={sendMessage} onTyping={sendTyping} onUpArrow={handleUpArrow} />
    </div>
  );
}
