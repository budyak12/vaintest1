import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Lightweight rich text editor using contentEditable + execCommand.
 * Markdown-friendly: cmd+B/I/K shortcuts, simple toolbar.
 * Output is sanitized-ish HTML — sufficient for v1 mock backend.
 */
export function RichEditor({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      exec("bold");
    } else if (k === "i") {
      e.preventDefault();
      exec("italic");
    } else if (k === "k") {
      e.preventDefault();
      const url = window.prompt("Link URL");
      if (url) exec("createLink", url);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="hairline-b sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 bg-background/90 px-1 py-2 backdrop-blur sm:top-14">
        <ToolBtn onClick={() => exec("bold")}><Bold className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("italic")}><Italic className="h-3.5 w-3.5" /></ToolBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolBtn onClick={() => exec("formatBlock", "h2")}><Heading2 className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "h3")}><Heading3 className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "blockquote")}><Quote className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("formatBlock", "pre")}><Code className="h-3.5 w-3.5" /></ToolBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolBtn onClick={() => exec("insertUnorderedList")}><List className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn onClick={() => exec("insertOrderedList")}><ListOrdered className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) exec("createLink", url);
          }}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <ToolBtn onClick={() => exec("justifyLeft")} title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyCenter")} title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyRight")} title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("justifyFull")} title="Justify">
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onKeyDown={onKeyDown}
        data-placeholder={placeholder}
        className="prose-editorial min-h-[40vh] w-full focus:outline-none [&[data-placeholder]:empty]:before:content-[attr(data-placeholder)] [&[data-placeholder]:empty]:before:text-muted-foreground"
      />
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
    >
      {children}
    </button>
  );
}
