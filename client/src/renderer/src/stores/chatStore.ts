import { Store } from '@tanstack/store';
import type { ActiveView, Message } from '@/types';
import type { PresenceUser } from '@/components/chat/UserList';

interface ChatState {
  activeView: ActiveView | null;
  messages: Message[];
  allUsers: PresenceUser[];
  typingUsers: Map<number, string>;
  hasMore: boolean;
  loadingMore: boolean;
  unreadStartIndex: number | null;
}

export const chatStore = new Store<ChatState>({
  activeView: null,
  messages: [],
  allUsers: [],
  typingUsers: new Map(),
  hasMore: false,
  loadingMore: false,
  unreadStartIndex: null,
});
