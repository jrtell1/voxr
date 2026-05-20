import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Kbd } from '@/components/ui/kbd';

interface Props {
  value: string;
  label: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTyping?: () => void;
}

export default function MessageInput({ value, label, onChange, onSubmit, onTyping }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    if (e.target.value && onTyping) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2000) {
        lastTypingRef.current = now;
        onTyping();
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="pb-4 px-4 shrink-0">
      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${label}`}
          className="resize-none overflow-hidden min-h-11 max-h-40 py-2.5 pr-14"
          rows={1}
          autoFocus
        />
        <Kbd className="absolute bottom-2 right-2 h-7 px-2.5 text-sm">↵</Kbd>
      </div>
    </div>
  );
}
