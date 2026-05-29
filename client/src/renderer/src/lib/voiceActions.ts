import { Room, RoomEvent, ConnectionState } from 'livekit-client';
import type { Channel as PhxChannel } from 'phoenix';
import type { Channel } from '@/types';
import { voiceStore } from '@/stores/voiceStore';

let _serverChannel: PhxChannel | null = null;
let _room: Room | null = null;

export function initVoice(serverChannel: PhxChannel) {
  _serverChannel = serverChannel;
}

export function joinVoiceChannel(channel: Channel) {
  _serverChannel?.push('join_voice', { channel_id: channel.id })
    .receive('ok', async ({ token, url }: { token: string; url: string }) => {
      console.log('[Voice] got token, connecting to', url);
      _room?.disconnect();

      const room = new Room();

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('[Voice] connection state:', state);
      });
      room.on(RoomEvent.ParticipantConnected, (p) => {
        console.log('[Voice] participant connected:', p.identity, p.name);
      });
      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        console.log('[Voice] participant disconnected:', p.identity);
      });
      room.on(RoomEvent.TrackPublished, (pub, p) => {
        console.log('[Voice] track published:', pub.kind, 'from', p.identity, 'subscribed:', pub.isSubscribed);
      });
      room.on(RoomEvent.TrackSubscribed, (track, pub, p) => {
        console.log('[Voice] track subscribed:', track.kind, 'from', p.identity);
        if (track.kind === 'audio') {
          const el = track.attach();
          el.setAttribute('data-livekit-participant', p.identity);
          document.body.appendChild(el);
          el.play().catch((e) => console.error('[Voice] audio play failed:', e));
          console.log('[Voice] audio element attached for', p.identity);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, pub, p) => {
        if (track.kind === 'audio') {
          track.detach().forEach((el) => el.remove());
        }
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        console.log('[Voice] audio playback can play:', room.canPlaybackAudio);
      });
      room.on(RoomEvent.MediaDevicesError, (err) => {
        console.error('[Voice] media devices error:', err);
      });

      room.on(RoomEvent.Disconnected, () => {
        voiceStore.setState(() => ({ voiceState: null, isMuted: false, speakingUserIds: new Set() }));
        _room = null;
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => parseInt(s.identity, 10)));
        const localId = parseInt(room.localParticipant.identity, 10);
        voiceStore.setState((prev) => ({
          ...prev,
          speakingUserIds: ids,
          voiceState: prev.voiceState
            ? { ...prev.voiceState, isSpeaking: ids.has(localId) }
            : prev.voiceState,
        }));
      });

      _room = room;
      voiceStore.setState((prev) => ({ ...prev, connectingChannelName: channel.name }));

      try {
        await room.connect(url, token);
        console.log('[Voice] connected, local identity:', room.localParticipant.identity);
        console.log('[Voice] remote participants:', room.remoteParticipants.size);

        const audioStarted = await room.startAudio();
        console.log('[Voice] startAudio result:', audioStarted, 'canPlaybackAudio:', room.canPlaybackAudio);

        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('[Voice] microphone enabled');

        _serverChannel?.push('confirm_voice_join', { channel_id: channel.id });

        voiceStore.setState((prev) => ({
          ...prev,
          connectingChannelName: null,
          voiceState: { channelId: channel.id, channelName: channel.name, isSpeaking: false },
        }));
      } catch (err) {
        console.error('[Voice] connection failed:', err);
        _room = null;
        room.disconnect();
        voiceStore.setState((prev) => ({ ...prev, connectingChannelName: null }));
      }
    });
}

export function leaveVoiceChannel() {
  _room?.disconnect();
  _room = null;
  _serverChannel?.push('leave_voice', {});
  voiceStore.setState(() => ({ voiceState: null, isMuted: false, speakingUserIds: new Set(), connectingChannelName: null }));
}

export function abortVoiceConnection() {
  _room?.disconnect();
  _room = null;
  voiceStore.setState((prev) => ({ ...prev, connectingChannelName: null }));
}

export async function toggleMute() {
  if (!_room) return;
  const newMuted = !voiceStore.state.isMuted;
  await _room.localParticipant.setMicrophoneEnabled(!newMuted);
  voiceStore.setState((prev) => ({ ...prev, isMuted: newMuted }));
}

export function cleanupVoice() {
  _room?.disconnect();
  _room = null;
  _serverChannel = null;
  voiceStore.setState(() => ({ voiceState: null, isMuted: false, speakingUserIds: new Set(), connectingChannelName: null }));
}
