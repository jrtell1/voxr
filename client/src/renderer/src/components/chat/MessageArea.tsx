import { useLayoutEffect, useRef } from 'react';
import { useSelector } from '@tanstack/react-store';
import { chatStore } from '@/stores/chatStore';
import { sendMessage, sendTyping, loadMoreMessages, sendPoke, openDm, scrollFlags } from '@/lib/chatActions';
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (scrollFlags.prevScrollHeight !== null && container) {
      container.scrollTop = container.scrollHeight - scrollFlags.prevScrollHeight;
      scrollFlags.prevScrollHeight = null;
      return;
    }
    if (scrollFlags.scrollToUnread && dividerRef.current) {
      dividerRef.current.scrollIntoView();
      scrollFlags.scrollToUnread = false;
    } else {
      messagesEndRef.current?.scrollIntoView();
    }
  }, [messages]);

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
      />
      <TypingIndicator names={[...typingUsers.values()]} />
      <MessageInput label={messageLabel} onSubmit={sendMessage} onTyping={sendTyping} />
    </div>
  );
}
