import { useState, FormEvent } from 'react';
import type { Channel } from '../../types';
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
import { LogOutIcon, SettingsIcon } from 'lucide-react';

interface Props {
  serverName: string;
  username: string;
  displayName: string | null;
  channels: Channel[];
  unread: Record<number, number>;
  activeChannelId: number | undefined;
  onJoinChannel: (channel: Channel) => void;
  onDisplayNameChange: (name: string) => Promise<void>;
  onDisconnect: () => void;
}

export default function ChatSidebar({
  serverName,
  username,
  displayName,
  channels,
  unread,
  activeChannelId,
  onJoinChannel,
  onDisplayNameChange,
  onDisconnect,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        </SidebarContent>

        <SidebarFooter className="border-t">
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar size="sm">
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
              <Button type="button" variant="destructive" onClick={onDisconnect}>
                <LogOutIcon className="size-3.5" />
                Disconnect from server
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
