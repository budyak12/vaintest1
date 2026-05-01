import { Fragment, type ReactNode } from "react";

// Available emoji shortcodes. The image lives at /emoji/<name>.png
// Order roughly mirrors the reference picker layout: round-style faces first
// (expressive, colorful), then the white "bun" character set.
export const EMOJI_NAMES = [
  // Row 1 — round, basic emotions
  "smile", "happy", "angry", "cry", "embarrassed", "surprised", "wronged", "shout",
  // Row 2 — round, varied moods
  "flushed", "lovely", "complacent", "loveface", "scream", "weep", "speechless", "funnyface",
  // Row 3 — round, reactions
  "laughwithtears", "wicked", "facewithrollingeyes", "sulk", "thinking", "pride", "greedy", "astonish",
  // Row 4 — bun, happy/playful
  "hehe", "joyful", "slap", "tears", "drool", "cute", "blink", "disdain",
  // Row 5 — bun, intense
  "rage", "shock", "cool", "excited", "evil", "smileface", "wow", "angel",
  // Row 6 — bun, leftover
  "laugh", "nap", "yummy", "proud", "awkward", "stun",
] as const;

export type EmojiName = (typeof EMOJI_NAMES)[number];

const NAME_SET = new Set<string>(EMOJI_NAMES as readonly string[]);

export function emojiUrl(name: string): string {
  return `/emoji/${name}.png`;
}

export function emojiShortcode(name: EmojiName): string {
  return `:${name}:`;
}

// Inline <img> tag used inside RichEditor (TipTap) HTML content.
export function emojiImgHtml(name: EmojiName): string {
  return `<img src="${emojiUrl(name)}" alt=":${name}:" data-emoji="${name}" class="vain-emoji" />`;
}

// Regex to match :shortcode: tokens inside plain text.
const TOKEN_RE = /:([a-z]+):/g;

/**
 * Render plain text with `:emoji:` shortcodes as React nodes,
 * substituting matched names with inline <img> tags sized to the surrounding text.
 */
export function renderTextWithEmoji(text: string): ReactNode {
  if (!text) return text;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    const name = m[1];
    if (!NAME_SET.has(name)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <img
        key={`${m.index}-${name}`}
        src={emojiUrl(name)}
        alt=""
        title={`:${name}:`}
        className="vain-emoji"
        draggable={false}
        loading="lazy"
        onError={(e) => {
          // If the emoji asset fails to load on a device, hide the broken image
          // instead of surfacing the literal shortcode via the alt attribute.
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />,
    );
    last = m.index + m[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
