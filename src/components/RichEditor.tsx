import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
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
  Image as ImageIcon,
  Film,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizableMedia, type ResizableMediaKind } from "./editor/ResizableMedia";
import { uploadToStorage, detectMediaType } from "./editor/upload";
import { EmojiPicker } from "./EmojiPicker";
import { emojiImgHtml } from "@/lib/emoji";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Dropcursor.configure({ width: 2 }),
      Gapcursor,
      ResizableMedia,
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose-editorial min-h-[40vh] w-full focus:outline-none rm-editor",
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void handleFiles(files, coords?.pos);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        if (!files.length) return false;
        event.preventDefault();
        void handleFiles(files);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
  });

  // Sync incoming value (e.g. when loading existing entry)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  const handleFiles = useCallback(
    async (files: File[], pos?: number) => {
      if (!editor) return;
      for (const file of files) {
        const kind = detectMediaType(file);
        if (!kind) continue;
        try {
          const { url, alt } = await uploadToStorage(file, kind);
          if (typeof pos === "number") {
            editor
              .chain()
              .focus()
              .insertContentAt(pos, {
                type: "resizableMedia",
                attrs: { src: url, alt, kind, align: "center", width: "100%", lockRatio: true },
              })
              .run();
          } else {
            editor.chain().focus().insertResizableMedia({ src: url, alt, kind }).run();
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Upload failed");
        }
      }
    },
    [editor],
  );

  if (!editor) {
    return <div className={cn("min-h-[40vh] rounded-md border border-border bg-subtle/30", className)} />;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Toolbar editor={editor} onPickFiles={handleFiles} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onPickFiles,
}: {
  editor: Editor;
  onPickFiles: (files: File[]) => void | Promise<void>;
}) {
  const insertByUrl = (kind: ResizableMediaKind) => {
    const url = window.prompt(`Paste ${kind} URL`);
    if (!url) return;
    const alt = kind === "image" ? window.prompt("Alt text (optional)") || null : null;
    editor.chain().focus().insertResizableMedia({ src: url, alt, kind }).run();
  };

  return (
    <div className="hairline-b sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 bg-background/90 px-1 py-2 backdrop-blur sm:top-14">
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
        <Code className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Link URL", prev ?? "");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
        active={editor.isActive("link")}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>
      <span className="mx-1 h-4 w-px bg-border" />
      <MediaInsertBtn kind="image" icon={<ImageIcon className="h-3.5 w-3.5" />} onPickFiles={onPickFiles} onUrl={() => insertByUrl("image")} />
      <MediaInsertBtn kind="video" icon={<Film className="h-3.5 w-3.5" />} onPickFiles={onPickFiles} onUrl={() => insertByUrl("video")} />
      <MediaInsertBtn kind="audio" icon={<Music className="h-3.5 w-3.5" />} onPickFiles={onPickFiles} onUrl={() => insertByUrl("audio")} />
      <span className="mx-1 h-4 w-px bg-border" />
      <EmojiPicker
        onPick={(name) =>
          editor.chain().focus().insertContent(emojiImgHtml(name)).run()
        }
      />
    </div>
  );
}

function MediaInsertBtn({
  kind,
  icon,
  onPickFiles,
  onUrl,
}: {
  kind: ResizableMediaKind;
  icon: React.ReactNode;
  onPickFiles: (files: File[]) => void | Promise<void>;
  onUrl: () => void;
}) {
  const accept = kind === "image" ? "image/*" : kind === "video" ? "video/*" : "audio/*";
  return (
    <span className="inline-flex items-center overflow-hidden rounded-md">
      <label
        title={`Insert ${kind} from device`}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-l-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
        onMouseDown={(e) => e.preventDefault()}
      >
        {icon}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) void onPickFiles(files);
            e.target.value = "";
          }}
        />
      </label>
      <button
        type="button"
        title={`Insert ${kind} by URL`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onUrl}
        className="h-8 rounded-r-md px-1.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
      >
        URL
      </button>
    </span>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground",
        active && "bg-foreground text-background hover:bg-foreground hover:text-background",
      )}
    >
      {children}
    </button>
  );
}
