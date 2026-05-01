import { Fragment, useMemo, type ReactNode } from "react";
import parse, { domToReact, type DOMNode, type HTMLReactParserOptions } from "html-react-parser";
import { Element } from "domhandler";
import { AudioPlayer, VideoPlayer } from "./MediaPlayers";

/**
 * Renders article body HTML, swapping any <audio>/<video> tags for the
 * project's custom React players so previously-published articles get the
 * same UI as freshly-composed ones.
 */
export function ArticleContent({ html, className }: { html: string; className?: string }) {
  const content: ReactNode = useMemo(() => {
    if (!html) return null;
    const options: HTMLReactParserOptions = {
      replace: (node) => {
        if (!(node instanceof Element)) return undefined;

        // Find a media element nested inside common wrappers (figure/div),
        // so resizable/audio/video markup keeps its outer alignment frame.
        const mediaTag = (() => {
          if (node.name === "audio" || node.name === "video") return node;
          if (node.children) {
            for (const child of node.children) {
              if (child instanceof Element && (child.name === "audio" || child.name === "video")) {
                return child;
              }
            }
          }
          return null;
        })();

        if (!mediaTag) return undefined;

        // Pull src either from attribute or from the first <source> child.
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

        const title = mediaTag.attribs?.title || mediaTag.attribs?.["data-title"] || mediaTag.attribs?.alt;
        const player =
          mediaTag.name === "audio" ? (
            <AudioPlayer src={src} title={title} className="h-full w-full" />
          ) : (
            <VideoPlayer src={src} className="h-full w-full" />
          );

        // If the parent is a wrapper figure/div from the editor, keep it for
        // alignment / sizing; otherwise just render the player.
        if (node !== mediaTag) {
          // Re-emit the wrapper but replace inner children with our player.
          const Tag = node.name as keyof JSX.IntrinsicElements;
          const props: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(node.attribs ?? {})) {
            // class -> className
            if (k === "class") props.className = v;
            else if (k === "style") {
              // crude inline-style → object conversion
              const style: Record<string, string> = {};
              for (const decl of String(v).split(";")) {
                const [prop, val] = decl.split(":").map((x) => x?.trim());
                if (prop && val) {
                  const camel = prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
                  style[camel] = val;
                }
              }
              props.style = style;
            } else {
              props[k] = v;
            }
          }
          return <Tag {...props}>{player}</Tag>;
        }
        return player;
      },
    };

    const parsed = parse(html, options);
    return <Fragment>{parsed as ReactNode}</Fragment>;

    // expose helper for tooling
    void domToReact;
    void ({} as DOMNode);
  }, [html]);

  return <div className={className}>{content}</div>;
}
