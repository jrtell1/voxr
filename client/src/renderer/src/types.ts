import type { Socket } from 'phoenix';

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

export interface Session {
  socket: Socket;
  serverUrl: string;
  serverName: string;
  username: string;
  channels: Channel[];
}
