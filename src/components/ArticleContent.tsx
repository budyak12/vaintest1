import { Fragment, useMemo, type ReactElement, type ReactNode, createElement } from "react";
import parse, { type HTMLReactParserOptions, Element } from "html-react-parser";
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
      replace: (domNode) => {
        if (!(domNode instanceof Element)) return undefined;
        const node = domNode;

        // Find a media element either at this node or directly nested below.
        const mediaTag: Element | null = (() => {
          if (node.name === "audio" || node.name === "video") return node;
          const children = node.children ?? [];
          for (const child of children) {
            if (child instanceof Element && (child.name === "audio" || child.name === "video")) {
              return child;
            }
          }
          return null;
        })();

        if (!mediaTag) return undefined;

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

        const player: ReactElement =
          mediaTag.name === "audio" ? (
            <AudioPlayer src={src} title={title} className="h-full w-full" />
          ) : (
            <VideoPlayer src={src} className="h-full w-full" />
          );

        // If the parent is a wrapper figure/div (alignment frame from the
        // editor), re-emit the wrapper around our custom player. Otherwise
        // just render the player directly.
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
