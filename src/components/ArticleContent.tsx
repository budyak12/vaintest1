import { Fragment, useMemo, type ReactElement, type ReactNode, createElement } from "react";
import parse, { type HTMLReactParserOptions, Element } from "html-react-parser";
import { AudioPlayer, VideoPlayer } from "./MediaPlayers";
import { Sticker } from "./Sticker";

/**
 * Renders article body HTML, swapping any <audio>/<video> tags for the
 * project's custom React players so previously-published articles get the
 * same UI as freshly-composed ones. Recognises sticker videos via the
 * `data-sticker="true"` attribute and renders them as looping autoplay
 * sticker previews instead of full video players.
 */
export function ArticleContent({ html, className }: { html: string; className?: string }) {
  const content: ReactNode = useMemo(() => {
    if (!html) return null;
    const options: HTMLReactParserOptions = {
      replace: (domNode) => {
        if (!(domNode instanceof Element)) return undefined;
        const node = domNode;

        // Find a media element either at this node or anywhere directly nested
        // below (figures from the editor wrap the actual <audio>/<video>).
        const findMedia = (n: Element): Element | null => {
          if (n.name === "audio" || n.name === "video") return n;
          for (const child of n.children ?? []) {
            if (child instanceof Element) {
              const found = findMedia(child);
              if (found) return found;
            }
          }
          return null;
        };

        const mediaTag = findMedia(node);
        if (!mediaTag) return undefined;

        // Resolve src either from the attribute or from a nested <source>.
        let src = mediaTag.attribs?.src;
        if (!src && mediaTag.children) {
          for (const child of mediaTag.children) {
            if (child instanceof Element && child.name === "source" && child.attribs?.src) {
              src = child.attribs.src;
              break;
            }
          }
        }
        if (!src) return undefined;

        const title =
          mediaTag.attribs?.title ||
          mediaTag.attribs?.["data-title"] ||
          mediaTag.attribs?.alt;

        const isSticker =
          mediaTag.name === "video" &&
          (mediaTag.attribs?.["data-sticker"] === "true" ||
            (mediaTag.attribs?.class || "").includes("vain-sticker"));

        const player: ReactElement = isSticker ? (
          <Sticker src={src} size={128} />
        ) : mediaTag.name === "audio" ? (
          <AudioPlayer src={src} title={title} className="h-full w-full" />
        ) : (
          <VideoPlayer src={src} className="h-full w-full" />
        );

        // If we matched a parent wrapper (figure/div) keep the wrapper for
        // alignment / sizing, otherwise just render the player directly.
        if (node !== mediaTag) {
          const props: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(node.attribs ?? {})) {
            if (k === "class") props.className = v;
            else if (k === "style") {
              const style: Record<string, string> = {};
              for (const decl of String(v).split(";")) {
                const [prop, val] = decl.split(":").map((x) => x?.trim());
                if (prop && val) {
                  const camel = prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
                  style[camel] = val;
                }
              }
              // Audio players have intrinsic height — drop any forced height
              // coming from the editor figure so the player isn't squished.
              if (mediaTag.name === "audio") {
                delete style.height;
              }
              props.style = style;
            } else {
              props[k] = v;
            }
          }
          return createElement(node.name, props, player);
        }
        return player;
      },
    };

    return <Fragment>{parse(html, options) as ReactNode}</Fragment>;
  }, [html]);

  return <div className={className}>{content}</div>;
}
