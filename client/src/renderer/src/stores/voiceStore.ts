import { Store } from '@tanstack/store';

interface VoiceState {
  voiceState: { channelId: number; channelName: string; isSpeaking: boolean } | null;
  isMuted: boolean;
  speakingUserIds: Set<number>;
}

export const voiceStore = new Store<VoiceState>({
  voiceState: null,
  isMuted: false,
  speakingUserIds: new Set(),
});
