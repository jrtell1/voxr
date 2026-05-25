import { Store } from '@tanstack/store';
import type { Channel, DmChannel } from '@/types';

interface PresenceMeta {
  username: string;
  display_name: string | null;
  voice_channel_id?: number | null;
}

export interface ServerPresences {
  [id: string]: { metas: PresenceMeta[] };
}

interface ServerState {
  presences: ServerPresences;
  unread: Record<number, number>;
  dmChannels: DmChannel[];
  channels: Channel[];
  isAdmin: boolean;
  pokeFrom: string | null;
  displayName: string | null;
}

export const serverStore = new Store<ServerState>({
  presences: {},
  unread: {},
  dmChannels: [],
  channels: [],
  isAdmin: false,
  pokeFrom: null,
  displayName: null,
});
