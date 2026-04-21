import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

export function TagInput({ tags, onChange, className }: Props) {
  const [val, setVal] = useState("");

  function add(raw: string) {
    const t = raw.trim().replace(/^#/, "").toLowerCase();
    if (!t) return;
    if (tags.includes(t)) return;
    onChange([...tags, t]);
    setVal("");
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-subtle px-2.5 py-1.5",
        className,
      )}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(val);
          } else if (e.key === "Backspace" && !val && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => val && add(val)}
        placeholder={tags.length ? "" : "Add tags…"}
        className="min-w-[6rem] flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
