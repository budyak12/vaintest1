import { Fragment, type ReactNode } from "react";

// Available emoji shortcodes. The image lives at /emoji/<name>.png
export const EMOJI_NAMES = [
  "angel","angry","astonish","awkward","blink","complacent","cool","cry","cute",
  "disdain","drool","embarrassed","evil","excited","facewithrollingeyes","flushed",
  "funnyface","greedy","happy","hehe","joyful","laugh","laughwithtears","loveface",
  "lovely","nap","pride","proud","rage","scream","shock","shout","slap","smile",
  "smileface","speechless","stun","sulk","surprised","tears","thinking","weep",
  "wicked","wow","wronged","yummy",
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
