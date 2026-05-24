import type { Socket, Channel as PhxChannel } from 'phoenix';
import type { Attachment, Channel, DmChannel, ChatUser, Message, Reaction } from '../types';
import { chatStore } from '@/stores/chatStore';
import { serverStore } from '@/stores/serverStore';
import { saveLastChannel } from './storage';

let _socket: Socket | null = null;
let _userChannel: PhxChannel | null = null;
let _channelRef: PhxChannel | null = null;
let _serverUrl = '';
let _token = '';
const _typingTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

export const scrollFlags = {
  scrollToUnread: false,
  prevScrollHeight: null as number | null,
};

export function initChat(socket: Socket, userChannel: PhxChannel, serverUrl: string, token: string) {
  _socket = socket;
  _userChannel = userChannel;
  _serverUrl = serverUrl;
  _token = token;
  chatStore.setState((prev) => ({ ...prev, serverUrl }));
}

function doJoin(topic: string, onJoinOk: (data: Record<string, unknown>) => void) {
  if (!_socket) return;
  const phxChannel = _socket.channel(topic);

  phxChannel
    .join()
    .receive('ok', onJoinOk)
    .receive('error', (err: unknown) => console.error('Join error', err));

  phxChannel.on('new_message', (msg: Message) => {
    chatStore.setState((prev) => {
      if (prev.messages.some((m) => m.id === msg.id)) return prev;
      const idx = prev.messages.findIndex((m) => m.id > msg.id);
      const messages = idx === -1
        ? [...prev.messages, msg]
        : [...prev.messages.slice(0, idx), msg, ...prev.messages.slice(idx)];
      return { ...prev, messages };
    });
  });

  phxChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
    serverStore.setState((prev) => ({ ...prev, unread: { ...prev.unread, [channel_id]: count } }));
  });

  phxChannel.on('reaction_updated', ({ message_id, reactions }: { message_id: number; reactions: Reaction[] }) => {
    chatStore.setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => m.id === message_id ? { ...m, reactions } : m),
    }));
  });

  phxChannel.on('typing', ({ user_id, name }: { user_id: number; name: string }) => {
    const existing = _typingTimeouts.get(user_id);
    if (existing) clearTimeout(existing);
    chatStore.setState((prev) => {
      const next = new Map(prev.typingUsers);
      next.set(user_id, name);
      return { ...prev, typingUsers: next };
    });
    const timeout = setTimeout(() => {
      chatStore.setState((prev) => {
        const next = new Map(prev.typingUsers);
        next.delete(user_id);
        return { ...prev, typingUsers: next };
      });
      _typingTimeouts.delete(user_id);
    }, 3000);
    _typingTimeouts.set(user_id, timeout);
  });

  _channelRef = phxChannel;
}

function switchPhxChannel(topic: string, onJoinOk: (data: Record<string, unknown>) => void) {
  chatStore.setState((prev) => ({ ...prev, hasMore: false, loadingMore: false }));

  const connect = () => doJoin(topic, onJoinOk);

  if (_channelRef) {
    const old = _channelRef;
    _channelRef = null;
    old.off('new_message');
    old.off('unread_updated');
    old.off('reaction_updated');
    old.off('typing');
    _typingTimeouts.forEach(clearTimeout);
    _typingTimeouts.clear();
    chatStore.setState((prev) => ({ ...prev, typingUsers: new Map() }));
    old.leave().receive('ok', connect);
  } else {
    connect();
  }
}

export function joinChannel(channel: Channel) {
  const { unread } = serverStore.state;
  switchPhxChannel(`room:${channel.id}`, ({ messages: history, has_more, users }) => {
    const history_ = history as Message[];
    const users_ = users as { id: number; username: string; display_name: string | null }[];
    const incoming = users_.map((u) => ({
      id: String(u.id),
      userId: u.id,
      username: u.username,
      displayName: u.display_name,
    }));
    const unreadCount = unread[channel.id] ?? 0;

    chatStore.setState((prev) => ({
      ...prev,
      messages: history_,
      hasMore: has_more as boolean,
      activeView: { type: 'channel', channel },
      allUsers: prev.allUsers.length === incoming.length && prev.allUsers.every((u, i) => u.id === incoming[i].id)
        ? prev.allUsers : incoming,
      unreadStartIndex: unreadCount > 0 && history_.length > 0
        ? Math.max(0, history_.length - unreadCount) : null,
    }));
    serverStore.setState((prev) => ({ ...prev, unread: { ...prev.unread, [channel.id]: 0 } }));
    saveLastChannel(_serverUrl, channel.id);
    scrollFlags.scrollToUnread = unreadCount > 0 && history_.length > 0;
  });
}

export function joinDmChannel(dmChannel: DmChannel) {
  const { unread } = serverStore.state;
  switchPhxChannel(`room:${dmChannel.id}`, ({ messages: history, has_more }) => {
    const history_ = history as Message[];
    const unreadCount = unread[dmChannel.id] ?? 0;

    chatStore.setState((prev) => ({
      ...prev,
      messages: history_,
      hasMore: has_more as boolean,
      activeView: { type: 'dm', dmChannel },
      unreadStartIndex: unreadCount > 0 && history_.length > 0
        ? Math.max(0, history_.length - unreadCount) : null,
    }));
    serverStore.setState((prev) => ({ ...prev, unread: { ...prev.unread, [dmChannel.id]: 0 } }));
    scrollFlags.scrollToUnread = unreadCount > 0 && history_.length > 0;
  });
}

export function openDm(targetUser: ChatUser) {
  const existing = serverStore.state.dmChannels.find((d) => d.other_user.id === targetUser.id);
  if (existing) {
    joinDmChannel(existing);
    return;
  }
  if (_channelRef) {
    const old = _channelRef;
    _channelRef = null;
    old.off('new_message');
    old.off('unread_updated');
    old.off('typing');
    old.leave();
  }
  chatStore.setState((prev) => ({
    ...prev,
    messages: [],
    allUsers: [],
    activeView: { type: 'pending_dm', targetUser },
  }));
}

export function loadMoreMessages() {
  const { loadingMore, hasMore, messages } = chatStore.state;
  if (!_channelRef || loadingMore || !hasMore || messages.length === 0) return;

  chatStore.setState((prev) => ({ ...prev, loadingMore: true }));
  _channelRef.push('load_more', { before_id: messages[0].id })
    .receive('ok', ({ messages: older, has_more }: { messages: Message[]; has_more: boolean }) => {
      chatStore.setState((prev) => ({
        ...prev,
        messages: [...older, ...prev.messages],
        unreadStartIndex: prev.unreadStartIndex !== null ? prev.unreadStartIndex + older.length : null,
        hasMore: has_more,
        loadingMore: false,
      }));
    });
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${_serverUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${_token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}

export async function sendMessage(content: string, files: File[] = []) {
  const { activeView } = chatStore.state;

  const attachments: Attachment[] = files.length > 0
    ? await Promise.all(files.map(uploadAttachment))
    : [];

  const payload = { content, attachments };

  if (activeView?.type === 'pending_dm') {
    const targetUser = activeView.targetUser;
    _userChannel?.push('open_dm', { user_id: targetUser.id })
      .receive('ok', ({ channel_id, other_user }: { channel_id: number; other_user: ChatUser }) => {
        const dmChannel: DmChannel = { id: channel_id, other_user };
        serverStore.setState((prev) => ({
          ...prev,
          dmChannels: prev.dmChannels.some((d) => d.id === channel_id)
            ? prev.dmChannels : [...prev.dmChannels, dmChannel],
        }));
        switchPhxChannel(`room:${channel_id}`, ({ messages: history }) => {
          chatStore.setState((prev) => ({
            ...prev,
            messages: history as Message[],
            activeView: { type: 'dm', dmChannel },
            unreadStartIndex: null,
          }));
          scrollFlags.scrollToUnread = false;
          _channelRef?.push('send_message', payload);
        });
      });
    return;
  }

  _channelRef?.push('send_message', payload);
}

export function sendReaction(messageId: number, emoji: string) {
  _channelRef?.push('react', { message_id: messageId, emoji });
}

export function sendTyping() {
  _channelRef?.push('typing', {});
}

export function sendPoke(userId: number) {
  _userChannel?.push('poke', { user_id: userId });
}

export function cleanupChat() {
  if (_channelRef) {
    _channelRef.off('new_message');
    _channelRef.off('unread_updated');
    _channelRef.off('reaction_updated');
    _channelRef.off('typing');
    _channelRef.leave();
    _channelRef = null;
  }
  _typingTimeouts.forEach(clearTimeout);
  _typingTimeouts.clear();
  _socket = null;
  _userChannel = null;
  _serverUrl = '';
  _token = '';
  chatStore.setState(() => ({
    activeView: null,
    messages: [],
    allUsers: [],
    typingUsers: new Map(),
    hasMore: false,
    loadingMore: false,
    unreadStartIndex: null,
    serverUrl: '',
  }));
}
