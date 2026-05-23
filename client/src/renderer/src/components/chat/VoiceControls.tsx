import { useSelector } from '@tanstack/react-store';
import { MicIcon, MicOffIcon, PhoneOffIcon } from 'lucide-react';
import { voiceStore } from '../../stores/voiceStore';
import { toggleMute, leaveVoiceChannel } from '../../lib/voiceActions';

export default function VoiceControls() {
  const voiceState = useSelector(voiceStore, (s) => s.voiceState);
  const isMuted = useSelector(voiceStore, (s) => s.isMuted);

  if (!voiceState) return null;

  return (
    <div className="border-t px-3 py-2 flex items-center gap-1.5 bg-muted/20 select-none">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`size-2 rounded-full shrink-0 transition-colors ${
          isMuted ? 'bg-destructive/60' : voiceState.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-green-500/40'
        }`} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-none mb-0.5">Voice Connected</p>
          <p className="text-xs font-medium truncate leading-none">{voiceState.channelName}</p>
        </div>
      </div>
      <button
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        className="rounded p-1.5 hover:bg-muted transition-colors shrink-0"
      >
        {isMuted
          ? <MicOffIcon className="size-3.5 text-destructive" />
          : <MicIcon className="size-3.5" />
        }
      </button>
      <button
        onClick={leaveVoiceChannel}
        title="Leave voice channel"
        className="rounded p-1.5 hover:bg-muted transition-colors text-destructive shrink-0"
      >
        <PhoneOffIcon className="size-3.5" />
      </button>
    </div>
  );
}
