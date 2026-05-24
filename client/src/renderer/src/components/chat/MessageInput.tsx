import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, type ClipboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Kbd } from '@/components/ui/kbd';
import { XIcon, ImageIcon } from 'lucide-react';

interface Props {
  label: string;
  onSubmit: (content: string, files: File[]) => void;
  onTyping?: () => void;
}

export default function MessageInput({ label, onSubmit, onTyping }: Props) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    if (e.target.value && onTyping) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2000) {
        lastTypingRef.current = now;
        onTyping();
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItems = Array.from(e.clipboardData.items).filter((item) =>
      item.type.startsWith('image/')
    );
    if (imageItems.length === 0) return;
    e.preventDefault();
    const newFiles = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = value.trim();
      if (!content && files.length === 0) return;
      if (uploading) return;
      setUploading(true);
      try {
        await onSubmit(content, files);
        setValue('');
        setFiles([]);
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <div className="pb-4 px-4 shrink-0">
      {previews.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {previews.map((src, i) => (
            <div key={i} className="relative group shrink-0">
              <img
                src={src}
                alt={files[i]?.name}
                className="h-20 w-auto max-w-40 rounded-md object-cover border"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Message ${label}`}
          className="resize-none overflow-hidden min-h-11 max-h-40 py-2.5 pr-14"
          rows={1}
          autoFocus
          disabled={uploading}
        />
        {uploading
          ? <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">Uploading…</span>
          : files.length > 0
            ? <span className="absolute bottom-2.5 right-3 flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-3" />{files.length}</span>
            : <Kbd className="absolute bottom-2 right-2 h-7 px-2.5 text-sm">↵</Kbd>
        }
      </div>
    </div>
  );
}
