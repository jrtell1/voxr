import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';

interface Props {
  value: string;
  channelName: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function MessageInput({ value, channelName, onChange, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 p-4 shrink-0 border-t">
      <div className="relative flex-1">
        <Input
          className="h-11 pr-14 px-3"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Message #${channelName}`}
          autoFocus
        />
        <Kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 text-sm">↵</Kbd>
      </div>
    </form>
  );
}
