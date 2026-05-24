import type { Socket, Channel as PhxChannel } from 'phoenix';

export interface Channel {
  id: number;
  name: string;
  type: 'text' | 'voice';
}

export interface ChatUser {
  id: number;
  username: string;
  display_name: string | null;
}

export interface Attachment {
  url: string;
  filename: string;
  content_type: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  user_ids: number[];
}

export interface Message {
  id: number;
  content: string;
  inserted_at: string;
  user: ChatUser;
  attachments: Attachment[];
  reactions: Reaction[];
}

export interface VoiceParticipant {
  userId: number;
  username: string;
  displayName: string | null;
}

export interface DmChannel {
  id: number;
  other_user: ChatUser;
}

export type ActiveView =
  | { type: 'channel'; channel: Channel }
  | { type: 'dm'; dmChannel: DmChannel }
  | { type: 'pending_dm'; targetUser: ChatUser };

export interface CustomEmoji {
  id: number;
  shortcode: string;
  url: string;
  content_type: string;
}

export interface Session {
  socket: Socket;
  userChannel: PhxChannel;
  serverUrl: string;
  serverName: string;
  userId: number;
  username: string;
  displayName: string | null;
  channels: Channel[];
  initialUnread: Record<number, number>;
  dmChannels: DmChannel[];
  token: string;
}
