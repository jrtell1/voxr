import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent, type ClipboardEvent } from 'react';
import { useSelector } from '@tanstack/react-store';
import { Textarea } from '@/components/ui/textarea';
import { Kbd } from '@/components/ui/kbd';
import { XIcon, PaperclipIcon } from 'lucide-react';
import { searchEmoji, getEmojiQuery, type EmojiMatch } from '@/lib/emoji';
import { customEmojiStore } from '@/stores/customEmojiStore';
import { chatStore } from '@/stores/chatStore';
import type { PresenceUser } from './UserList';

interface Props {
  label: string;
  onSubmit: (content: string, files: File[]) => void;
  onTyping?: () => void;
  onUpArrow?: () => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp';

export default function MessageInput({ label, onSubmit, onTyping, onUpArrow }: Props) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [emojiResults, setEmojiResults] = useState<EmojiMatch[]>([]);
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [mentionResults, setMentionResults] = useState<PresenceUser[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);
  const emojiListRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const customEmojis = useSelector(customEmojiStore, (s) => s.emojis);
  const allUsers = useSelector(chatStore, (s) => s.allUsers);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    if (emojiListRef.current) {
      const selected = emojiListRef.current.children[emojiIndex] as HTMLElement | undefined;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [emojiIndex]);

  useEffect(() => {
    if (mentionListRef.current) {
      const selected = mentionListRef.current.children[mentionIndex] as HTMLElement | undefined;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionIndex]);

  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith('image/'));
    if (images.length > 0) setFiles((prev) => [...prev, ...images]);
  }

  function insertEmoji(match: EmojiMatch) {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    // Standard emoji: insert Unicode char. Custom emoji: insert :shortcode: syntax.
    const insert = match.kind === 'standard' ? match.native : `:${match.shortcode}:`;
    const newBefore = before.replace(/:([a-zA-Z0-9_+\-]*)$/, insert);
    const newValue = newBefore + after;
    setValue(newValue);
    setEmojiResults([]);
    setEmojiIndex(0);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newBefore.length;
      el.focus();
    });
  }

  function getMentionQuery(val: string, cursorPos: number): string | null {
    const before = val.slice(0, cursorPos);
    const match = before.match(/@([a-zA-Z0-9_]*)$/);
    return match ? match[1] : null;
  }

  function insertMention(user: PresenceUser) {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const newBefore = before.replace(/@([a-zA-Z0-9_]*)$/, `@${user.username} `);
    const newValue = newBefore + after;
    setValue(newValue);
    setMentionResults([]);
    setMentionIndex(0);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newBefore.length;
      el.focus();
    });
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);

    const cursor = e.target.selectionStart ?? newValue.length;
    const query = getEmojiQuery(newValue, cursor);
    if (query !== null) {
      setEmojiResults(searchEmoji(query, customEmojis));
      setEmojiIndex(0);
    } else {
      setEmojiResults([]);
    }

    const mentionQuery = getMentionQuery(newValue, cursor);
    if (mentionQuery !== null) {
      const q = mentionQuery.toLowerCase();
      const results = allUsers
        .filter((u) =>
          u.username.toLowerCase().includes(q) ||
          (u.displayName?.toLowerCase().includes(q) ?? false)
        )
        .slice(0, 8);
      setMentionResults(results);
      setMentionIndex(0);
    } else {
      setMentionResults([]);
    }

    if (newValue && onTyping) {
      const now = Date.now();
      if (now - lastTypingRef.current > 2000) {
        lastTypingRef.current = now;
        onTyping();
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const fileList = Array.from(e.clipboardData.files);
    if (fileList.length > 0) {
      const images = fileList.filter((f) => f.type.startsWith('image/'));
      if (images.length > 0) {
        e.preventDefault();
        addFiles(images);
        return;
      }
    }

    const imageItems = Array.from(e.clipboardData.items).filter((item) =>
      item.type.startsWith('image/')
    );
    if (imageItems.length === 0) return;
    e.preventDefault();
    addFiles(imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null));
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'ArrowUp' && value === '' && emojiResults.length === 0 && mentionResults.length === 0) {
      e.preventDefault();
      onUpArrow?.();
      return;
    }

    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionResults([]);
        return;
      }
    }

    if (emojiResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setEmojiIndex((i) => (i + 1) % emojiResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setEmojiIndex((i) => (i - 1 + emojiResults.length) % emojiResults.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertEmoji(emojiResults[emojiIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setEmojiResults([]);
        return;
      }
    }

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
        requestAnimationFrame(() => textareaRef.current?.focus());
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
        {mentionResults.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute bottom-full left-0 mb-1 w-64 max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md z-50"
          >
            {mentionResults.map((user, i) => (
              <button
                key={user.userId}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted ${i === mentionIndex ? 'bg-muted' : ''}`}
              >
                <span className="font-medium truncate">{user.displayName ?? user.username}</span>
                {user.displayName && (
                  <span className="text-muted-foreground truncate text-xs">@{user.username}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {emojiResults.length > 0 && (
          <div
            ref={emojiListRef}
            className="absolute bottom-full left-0 mb-1 w-64 max-h-52 overflow-y-auto rounded-md border bg-popover shadow-md z-50"
          >
            {emojiResults.map((match, i) => (
              <button
                key={match.shortcode}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertEmoji(match); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted ${i === emojiIndex ? 'bg-muted' : ''}`}
              >
                {match.kind === 'custom'
                  ? <img src={match.url} alt={match.shortcode} className="size-5 object-contain shrink-0" />
                  : <span className="text-base leading-none w-5 text-center shrink-0">{match.native}</span>
                }
                <span className="text-muted-foreground truncate">:{match.shortcode}:</span>
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute left-2 bottom-2 size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Attach image"
        >
          <PaperclipIcon className="size-3.5" />
        </button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Message ${label}`}
          className="resize-none overflow-hidden min-h-11 max-h-40 py-2.5 pl-10 pr-14"
          rows={1}
          autoFocus
          disabled={uploading}
        />
        {uploading
          ? <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">Uploading…</span>
          : <Kbd className="absolute bottom-2 right-2 h-7 px-2.5 text-sm">↵</Kbd>
        }
      </div>
    </div>
  );
}
