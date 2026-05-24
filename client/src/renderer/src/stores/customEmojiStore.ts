import { Store } from '@tanstack/store';
import type { CustomEmoji } from '../types';

export const customEmojiStore = new Store<{ emojis: CustomEmoji[] }>({
  emojis: [],
});
