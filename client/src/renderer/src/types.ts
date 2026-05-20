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

export interface Message {
  id: number;
  content: string;
  inserted_at: string;
  user: ChatUser;
}

export interface DmChannel {
  id: number;
  other_user: ChatUser;
}

export type ActiveView =
  | { type: 'channel'; channel: Channel }
  | { type: 'dm'; dmChannel: DmChannel };

export interface Session {
  socket: Socket;
  userChannel: PhxChannel;
  serverUrl: string;
  serverName: string;
  username: string;
  displayName: string | null;
  channels: Channel[];
  initialUnread: Record<number, number>;
  dmChannels: DmChannel[];
  token: string;
}
