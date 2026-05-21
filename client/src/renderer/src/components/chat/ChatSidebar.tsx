import { useState, FormEvent } from 'react';
import type { Channel, DmChannel, ActiveView, VoiceParticipant } from '../../types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOutIcon, SettingsIcon, Volume2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getShakeEnabled, setShakeEnabled, getSoundEnabled, setSoundEnabled } from '@/lib/storage';
import VoiceControls from './VoiceControls';

interface Props {
  serverName: string;
  username: string;
  displayName: string | null;
  channels: Channel[];
  voiceChannels: Channel[];
  dmChannels: DmChannel[];
  unread: Record<number, number>;
  activeView: ActiveView | null;
  voiceState: { channelId: number; channelName: string; isSpeaking: boolean } | null;
  voicePresence: Record<number, VoiceParticipant[]>;
  speakingUserIds: Set<number>;
  isMuted: boolean;
  onJoinChannel: (channel: Channel) => void;
  onJoinVoice: (channel: Channel) => void;
  onJoinDm: (dmChannel: DmChannel) => void;
  onToggleMute: () => void;
  onLeaveVoice: () => void;
  onDisplayNameChange: (name: string) => Promise<void>;
  onDisconnect: () => void;
}

export default function ChatSidebar({
  serverName,
  username,
  displayName,
  channels,
  voiceChannels,
  dmChannels,
  unread,
  activeView,
  voiceState,
  voicePresence,
  speakingUserIds,
  isMuted,
  onJoinChannel,
  onJoinVoice,
  onJoinDm,
  onToggleMute,
  onLeaveVoice,
  onDisplayNameChange,
  onDisconnect,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeEnabled, setShakeEnabledState] = useState(getShakeEnabled);
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled);

  function handleShakeToggle(checked: boolean) {
    setShakeEnabledState(checked);
    setShakeEnabled(checked);
  }

  function handleSoundToggle(checked: boolean) {
    setSoundEnabledState(checked);
    setSoundEnabled(checked);
  }

  function openSettings() {
    setNewName(displayName ?? username);
    setError(null);
    setSettingsOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await onDisplayNameChange(trimmed);
      setSettingsOpen(false);
    } catch {
      setError('Could not update display name');
    } finally {
      setSaving(false);
    }
  }

  const visibleName = displayName ?? username;
  const activeChannelId = activeView?.type === 'channel' ? activeView.channel.id : undefined;
  const activeDmId = activeView?.type === 'dm' ? activeView.dmChannel.id : undefined;

  return (
    <>
      <Sidebar collapsible="none">
        <SidebarHeader className="border-b px-4 h-12 flex-row items-center">
          <span className="font-bold text-sm truncate">{serverName}</span>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Text Channels</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {channels.map((ch) => {
                  const count = unread[ch.id] ?? 0;
                  const isActive = ch.id === activeChannelId;
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <SidebarMenuButton isActive={isActive} onClick={() => onJoinChannel(ch)}>
                        <span className="text-muted-foreground">#</span>
                        <span>{ch.name}</span>
                      </SidebarMenuButton>
                      {count > 0 && !isActive && (
                        <SidebarMenuBadge>{count > 99 ? '99+' : count}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {voiceChannels.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Voice Channels</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {voiceChannels.map((ch) => {
                    const participants = voicePresence[ch.id] ?? [];
                    const isActive = voiceState?.channelId === ch.id;
                    return (
                      <SidebarMenuItem key={ch.id}>
                        <SidebarMenuButton isActive={isActive} onClick={() => onJoinVoice(ch)}>
                          <Volume2Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{ch.name}</span>
                          {participants.length > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{participants.length}</span>
                          )}
                        </SidebarMenuButton>
                        {participants.length > 0 && (
                          <div className="pb-1 pl-9 pr-2 space-y-0.5">
                            {participants.map((p) => {
                              const speaking = speakingUserIds.has(p.userId);
                              return (
                                <div key={p.userId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <span className={`size-1.5 rounded-full shrink-0 transition-colors ${
                                    speaking ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'
                                  }`} />
                                  <span className={`truncate transition-colors ${speaking ? 'text-foreground font-medium' : ''}`}>
                                    {p.displayName ?? p.username}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {dmChannels.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {dmChannels.map((dm) => {
                    const name = dm.other_user.display_name ?? dm.other_user.username;
                    const isActive = dm.id === activeDmId;
                    const count = unread[dm.id] ?? 0;
                    return (
                      <SidebarMenuItem key={dm.id}>
                        <SidebarMenuButton isActive={isActive} onClick={() => onJoinDm(dm)}>
                          <Avatar size="sm">
                            <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{name}</span>
                        </SidebarMenuButton>
                        {count > 0 && !isActive && (
                          <SidebarMenuBadge>{count > 99 ? '99+' : count}</SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {voiceState && (
          <VoiceControls
            channelName={voiceState.channelName}
            isMuted={isMuted}
            isSpeaking={voiceState.isSpeaking}
            onToggleMute={onToggleMute}
            onLeave={onLeaveVoice}
          />
        )}

        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar size="default">
              <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{visibleName}</span>
              {displayName && displayName !== username && (
                <span className="text-xs text-muted-foreground truncate">@{username}</span>
              )}
            </div>
            <Button variant="ghost" size="icon-lg" onClick={openSettings}>
              <SettingsIcon className="size-3.5" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={settingsOpen} onOpenChange={(open) => { setSettingsOpen(open); if (!open) setError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={username}
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">This is how you appear in chat. Defaults to your username.</p>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="shakeEnabled"
                  checked={shakeEnabled}
                  onCheckedChange={(v) => handleShakeToggle(v === true)}
                />
                <Label htmlFor="shakeEnabled">Shake window on poke</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="soundEnabled"
                  checked={soundEnabled}
                  onCheckedChange={(v) => handleSoundToggle(v === true)}
                />
                <Label htmlFor="soundEnabled">Play sound on poke</Label>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
              <Button type="button" variant="destructive" onClick={onDisconnect}>
                <LogOutIcon className="size-3.5" />
                Logout
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !newName.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
