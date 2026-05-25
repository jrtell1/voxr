import { useState, useMemo, useRef, FormEvent, ChangeEvent } from 'react';
import { useSelector } from '@tanstack/react-store';
import type { VoiceParticipant } from '@/types';
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
import { LogOutIcon, SettingsIcon, Volume2Icon, TrashIcon, PlusIcon, ServerIcon, ChevronUpIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { getShakeEnabled, setShakeEnabled, getSoundEnabled, setSoundEnabled } from '@/lib/storage';
import VoiceControls from './VoiceControls';
import ServerAdminModal from './ServerAdminModal';
import { chatStore } from '@/stores/chatStore';
import { serverStore } from '@/stores/serverStore';
import { voiceStore } from '@/stores/voiceStore';
import { joinChannel, joinDmChannel } from '@/lib/chatActions';
import { joinVoiceChannel } from '@/lib/voiceActions';
import { updateDisplayName } from '@/lib/serverActions';
import { uploadCustomEmoji, deleteCustomEmoji } from '@/lib/customEmojiActions';
import { customEmojiStore } from '@/stores/customEmojiStore';

interface Props {
  serverName: string;
  username: string;
  onDisconnect: () => void;
}

export default function ChatSidebar({ serverName, username, onDisconnect }: Props) {
  const displayName = useSelector(serverStore, (s) => s.displayName);
  const dmChannels = useSelector(serverStore, (s) => s.dmChannels);
  const unread = useSelector(serverStore, (s) => s.unread);
  const presences = useSelector(serverStore, (s) => s.presences);
  const channels = useSelector(serverStore, (s) => s.channels);
  const isAdmin = useSelector(serverStore, (s) => s.isAdmin);
  const activeView = useSelector(chatStore, (s) => s.activeView);
  const voiceState = useSelector(voiceStore, (s) => s.voiceState);
  const speakingUserIds = useSelector(voiceStore, (s) => s.speakingUserIds);

  const textChannels = useMemo(() => channels.filter((c) => c.type === 'text'), [channels]);
  const voiceChannels = useMemo(() => channels.filter((c) => c.type === 'voice'), [channels]);

  const voicePresence = useMemo(() => {
    const result: Record<number, VoiceParticipant[]> = {};
    for (const [id, { metas }] of Object.entries(presences)) {
      const meta = metas[0];
      const vcId = meta.voice_channel_id;
      if (vcId != null) {
        if (!result[vcId]) result[vcId] = [];
        result[vcId].push({ userId: parseInt(id, 10), username: meta.username, displayName: meta.display_name });
      }
    }
    return result;
  }, [presences]);

  const customEmojis = useSelector(customEmojiStore, (s) => s.emojis);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeEnabled, setShakeEnabledState] = useState(getShakeEnabled);
  const [soundEnabled, setSoundEnabledState] = useState(getSoundEnabled);

  const [emojiShortcode, setEmojiShortcode] = useState('');
  const [emojiFile, setEmojiFile] = useState<File | null>(null);
  const [emojiUploading, setEmojiUploading] = useState(false);
  const [emojiError, setEmojiError] = useState<string | null>(null);
  const emojiFileRef = useRef<HTMLInputElement>(null);

  const [adminOpen, setAdminOpen] = useState(false);

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
      await updateDisplayName(trimmed);
      setSettingsOpen(false);
    } catch {
      setError('Could not update display name');
    } finally {
      setSaving(false);
    }
  }

  async function handleEmojiUpload() {
    if (!emojiFile || !emojiShortcode.trim()) return;
    const code = emojiShortcode.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,32}$/.test(code)) {
      setEmojiError('Shortcode must be 2–32 chars: lowercase letters, digits, underscores');
      return;
    }
    setEmojiUploading(true);
    setEmojiError(null);
    try {
      await uploadCustomEmoji(code, emojiFile);
      setEmojiShortcode('');
      setEmojiFile(null);
      if (emojiFileRef.current) emojiFileRef.current.value = '';
    } catch (e: unknown) {
      setEmojiError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setEmojiUploading(false);
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
                {textChannels.map((ch) => {
                  const count = unread[ch.id] ?? 0;
                  const isActive = ch.id === activeChannelId;
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <SidebarMenuButton isActive={isActive} onClick={() => joinChannel(ch)}>
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

          <SidebarGroup>
            <SidebarGroupLabel>Voice Channels</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {voiceChannels.map((ch) => {
                  const participants = voicePresence[ch.id] ?? [];
                  return (
                    <SidebarMenuItem key={ch.id}>
                      <SidebarMenuButton onClick={() => joinVoiceChannel(ch)}>
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
                        <SidebarMenuButton isActive={isActive} onClick={() => joinDmChannel(dm)}>
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

        <VoiceControls />

        <SidebarFooter className="border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 w-full rounded-md hover:bg-muted transition-colors text-left">
                <Avatar size="default">
                  <AvatarFallback>{visibleName[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{visibleName}</span>
                  {displayName && displayName !== username && (
                    <span className="text-xs text-muted-foreground truncate">@{username}</span>
                  )}
                </div>
                <ChevronUpIcon className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onClick={openSettings}>
                <SettingsIcon className="size-3.5" />
                Settings
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => setAdminOpen(true)}>
                  <ServerIcon className="size-3.5" />
                  Server Administration
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDisconnect}>
                <LogOutIcon className="size-3.5" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  onCheckedChange={(v) => { setShakeEnabledState(v === true); setShakeEnabled(v === true); }}
                />
                <Label htmlFor="shakeEnabled">Shake window on poke</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="soundEnabled"
                  checked={soundEnabled}
                  onCheckedChange={(v) => { setSoundEnabledState(v === true); setSoundEnabled(v === true); }}
                />
                <Label htmlFor="soundEnabled">Play sound on poke</Label>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Emojis</h3>

              {customEmojis.length > 0 && (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                  {customEmojis.map((emoji) => (
                    <div key={emoji.id} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted group">
                      <img src={emoji.url} alt={emoji.shortcode} className="size-6 object-contain shrink-0" />
                      <span className="text-sm flex-1 truncate">:{emoji.shortcode}:</span>
                      <button
                        type="button"
                        onClick={() => deleteCustomEmoji(emoji.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="shortcode"
                    value={emojiShortcode}
                    onChange={(e) => setEmojiShortcode(e.target.value)}
                    className="flex-1"
                    maxLength={32}
                  />
                  <input
                    ref={emojiFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmojiFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => emojiFileRef.current?.click()}
                    className="shrink-0"
                  >
                    {emojiFile ? emojiFile.name.slice(0, 12) + (emojiFile.name.length > 12 ? '…' : '') : 'Choose file'}
                  </Button>
                </div>
                {emojiError && <p className="text-xs text-destructive">{emojiError}</p>}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEmojiUpload}
                  disabled={emojiUploading || !emojiFile || !emojiShortcode.trim()}
                  className="self-start"
                >
                  <PlusIcon className="size-3.5" />
                  {emojiUploading ? 'Uploading…' : 'Add emoji'}
                </Button>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end">
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

      <ServerAdminModal open={adminOpen} onOpenChange={setAdminOpen} />
    </>
  );
}
