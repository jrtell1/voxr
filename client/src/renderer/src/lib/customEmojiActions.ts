import type { CustomEmoji } from '../types';
import { customEmojiStore } from '@/stores/customEmojiStore';

let _serverUrl = '';
let _token = '';

export function initCustomEmojis(serverUrl: string, token: string) {
  _serverUrl = serverUrl;
  _token = token;
  fetchCustomEmojis();
}

export async function fetchCustomEmojis() {
  const res = await fetch(`${_serverUrl}/api/emojis`, {
    headers: { Authorization: `Bearer ${_token}` },
  });
  if (!res.ok) return;
  const emojis: CustomEmoji[] = await res.json();
  const withFullUrls = emojis.map((e) => ({ ...e, url: `${_serverUrl}${e.url}` }));
  customEmojiStore.setState(() => ({ emojis: withFullUrls }));
}

export async function uploadCustomEmoji(shortcode: string, file: File): Promise<CustomEmoji> {
  const form = new FormData();
  form.append('file', file);
  form.append('shortcode', shortcode);
  const res = await fetch(`${_serverUrl}/api/emojis`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${_token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Upload failed (${res.status})`;
    try {
      const err = JSON.parse(text);
      message = err.error ?? err.errors?.detail ?? message;
    } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  const emoji: CustomEmoji = await res.json();
  const withFullUrl = { ...emoji, url: `${_serverUrl}${emoji.url}` };
  customEmojiStore.setState((prev) => ({ emojis: [...prev.emojis, withFullUrl] }));
  return withFullUrl;
}

export async function deleteCustomEmoji(id: number) {
  const res = await fetch(`${_serverUrl}/api/emojis/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${_token}` },
  });
  if (!res.ok) throw new Error('Delete failed');
  customEmojiStore.setState((prev) => ({ emojis: prev.emojis.filter((e) => e.id !== id) }));
}
