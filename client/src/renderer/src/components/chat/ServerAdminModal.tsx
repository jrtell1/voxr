import { useState } from 'react';
import { useSelector } from '@tanstack/react-store';
import { serverStore } from '@/stores/serverStore';
import { createChannel, deleteChannel } from '@/lib/serverActions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArchiveIcon, HashIcon, PlusIcon, Volume2Icon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ServerAdminModal({ open, onOpenChange }: Props) {
  const channels = useSelector(serverStore, (s) => s.channels);

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    const name = newChannelName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createChannel(name, newChannelType);
      setNewChannelName('');
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(channelId: number) {
    try {
      await deleteChannel(channelId);
    } catch {}
  }

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Server Administration</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create Channel</h3>
            <div className="flex gap-2">
              <div className="flex rounded-md border overflow-hidden shrink-0">
                <button
                  className={`px-3 py-1.5 text-xs transition-colors ${newChannelType === 'text' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setNewChannelType('text')}
                >
                  Text
                </button>
                <button
                  className={`px-3 py-1.5 text-xs transition-colors ${newChannelType === 'voice' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setNewChannelType('voice')}
                >
                  Voice
                </button>
              </div>
              <Input
                placeholder="channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={creating || !newChannelName.trim()}>
                <PlusIcon className="size-3.5" />
                Create
              </Button>
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</h3>
            <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
              {[...textChannels, ...voiceChannels].map((ch) => (
                <div key={ch.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted group">
                  {ch.type === 'text'
                    ? <HashIcon className="size-3.5 text-muted-foreground shrink-0" />
                    : <Volume2Icon className="size-3.5 text-muted-foreground shrink-0" />
                  }
                  <span className="text-sm flex-1 truncate">{ch.name}</span>
                  <button
                    type="button"
                    onClick={() => handleArchive(ch.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    title="Archive channel"
                  >
                    <ArchiveIcon className="size-3.5" />
                  </button>
                </div>
              ))}
              {channels.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">No channels yet.</p>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
