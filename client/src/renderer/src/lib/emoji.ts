// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no type declarations for @emoji-mart/data
import data from '@emoji-mart/data';

export interface EmojiMatch {
  shortcode: string;
  native: string;
}

const allEmojis: EmojiMatch[] = [];

for (const [id, emoji] of Object.entries(data.emojis as Record<string, { skins?: { native: string }[] }>)) {
  const native = emoji.skins?.[0]?.native;
  if (native) allEmojis.push({ shortcode: id, native });
}

for (const [alias, canonicalId] of Object.entries(data.aliases as Record<string, string>)) {
  const emoji = (data.emojis as Record<string, { skins?: { native: string }[] }>)[canonicalId];
  const native = emoji?.skins?.[0]?.native;
  if (native) allEmojis.push({ shortcode: alias, native });
}

export function searchEmoji(query: string, limit = 8): EmojiMatch[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  return allEmojis.filter((e) => e.shortcode.startsWith(lower)).slice(0, limit);
}

export function getEmojiQuery(value: string, cursorPos: number): string | null {
  const before = value.slice(0, cursorPos);
  const match = before.match(/:([a-zA-Z0-9_+\-]*)$/);
  return match ? match[1] : null;
}
