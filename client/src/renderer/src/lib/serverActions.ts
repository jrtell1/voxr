import { Presence } from 'phoenix';
import type { Channel as PhxChannel, Socket } from 'phoenix';
import type { ChatUser, DmChannel } from '@/types';
import { serverStore } from '@/stores/serverStore';
import { getShakeEnabled, getSoundEnabled } from './storage';

let _userChannel: PhxChannel | null = null;
let _serverChannel: PhxChannel | null = null;
let _lastPokeSoundTime = 0;

export function initServer(
  socket: Socket,
  userChannel: PhxChannel,
  initialUnread: Record<number, number>,
  initialDmChannels: DmChannel[],
  initialDisplayName: string | null,
): PhxChannel {
  _userChannel = userChannel;

  serverStore.setState(() => ({
    presences: {},
    unread: initialUnread,
    dmChannels: initialDmChannels,
    pokeFrom: null,
    displayName: initialDisplayName,
  }));

  userChannel.on('unread_updated', ({ channel_id, count }: { channel_id: number; count: number }) => {
    serverStore.setState((prev) => ({ ...prev, unread: { ...prev.unread, [channel_id]: count } }));
  });

  userChannel.on('dm_channel_opened', ({ channel_id, other_user }: { channel_id: number; other_user: ChatUser }) => {
    serverStore.setState((prev) => ({
      ...prev,
      dmChannels: prev.dmChannels.some((d) => d.id === channel_id)
        ? prev.dmChannels
        : [...prev.dmChannels, { id: channel_id, other_user }],
    }));
  });

  userChannel.on('poke', ({ from_display_name, from_username }: { from_id: number; from_username: string; from_display_name: string | null }) => {
    const name = from_display_name ?? from_username;
    serverStore.setState((prev) => ({ ...prev, pokeFrom: name }));
    setTimeout(() => serverStore.setState((prev) => ({ ...prev, pokeFrom: null })), 4000);
    window.electron?.notify('Voxr', `${name} poked you!`);
    const now = Date.now();
    if (now - _lastPokeSoundTime >= 60_000) {
      _lastPokeSoundTime = now;
      if (getSoundEnabled()) playPokeSound();
    }
    if (getShakeEnabled()) window.electron?.shake();
  });

  const serverChannel = socket.channel('server:lobby');
  _serverChannel = serverChannel;
  serverChannel.join();

  serverChannel.on('presence_state', (state) => {
    serverStore.setState((prev) => ({ ...prev, presences: Presence.syncState({}, state) }));
  });
  serverChannel.on('presence_diff', (diff) => {
    serverStore.setState((prev) => ({ ...prev, presences: { ...Presence.syncDiff(prev.presences, diff) } }));
  });

  return serverChannel;
}

export function updateDisplayName(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    _userChannel
      ?.push('update_display_name', { display_name: name })
      .receive('ok', () => {
        serverStore.setState((prev) => ({ ...prev, displayName: name }));
        resolve();
      })
      .receive('error', () => reject(new Error('Failed to update display name')));
  });
}

export function cleanupServer() {
  if (_userChannel) {
    _userChannel.off('unread_updated');
    _userChannel.off('dm_channel_opened');
    _userChannel.off('poke');
    _userChannel = null;
  }
  _serverChannel?.leave();
  _serverChannel = null;
}

function playPokeSound() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
  osc.onended = () => ctx.close();
}
