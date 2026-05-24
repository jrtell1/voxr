// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no type declarations for @emoji-mart/data
import data from '@emoji-mart/data';
import type { CustomEmoji } from '../types';

export type EmojiMatch =
  | { kind: 'standard'; shortcode: string; native: string }
  | { kind: 'custom'; shortcode: string; url: string; content_type: string; id: number };

// Build standard emoji list once at module load
const standardEmojis: { shortcode: string; native: string }[] = [];

for (const [id, emoji] of Object.entries(data.emojis as Record<string, { skins?: { native: string }[] }>)) {
  const native = emoji.skins?.[0]?.native;
  if (native) standardEmojis.push({ shortcode: id, native });
}

for (const [alias, canonicalId] of Object.entries(data.aliases as Record<string, string>)) {
  const emoji = (data.emojis as Record<string, { skins?: { native: string }[] }>)[canonicalId];
  const native = emoji?.skins?.[0]?.native;
  if (native) standardEmojis.push({ shortcode: alias, native });
}

export function searchEmoji(query: string, customEmojis: CustomEmoji[], limit = 8): EmojiMatch[] {
  if (!query) return [];
  const lower = query.toLowerCase();

  const customMatches: EmojiMatch[] = customEmojis
    .filter((e) => e.shortcode.startsWith(lower))
    .slice(0, limit)
    .map((e) => ({ kind: 'custom', shortcode: e.shortcode, url: e.url, content_type: e.content_type, id: e.id }));

  const remaining = limit - customMatches.length;
  const standardMatches: EmojiMatch[] = remaining > 0
    ? standardEmojis
        .filter((e) => e.shortcode.startsWith(lower))
        .slice(0, remaining)
        .map((e) => ({ kind: 'standard', shortcode: e.shortcode, native: e.native }))
    : [];

  return [...customMatches, ...standardMatches];
}

export function getEmojiQuery(value: string, cursorPos: number): string | null {
  const before = value.slice(0, cursorPos);
  const match = before.match(/:([a-zA-Z0-9_+\-]*)$/);
  return match ? match[1] : null;
}
