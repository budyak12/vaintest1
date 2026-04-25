// Slug generation utilities (mirrors public.slugify in DB).

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) {
    out += CYRILLIC_MAP[ch] ?? ch;
  }
  return out;
}

export function slugify(input: string): string {
  if (!input) return "";
  const t = transliterate(input);
  return t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Build a slug for a new entry. For posts, appends a short id suffix. */
export function buildEntrySlug(opts: {
  type: "post" | "article";
  title?: string;
  body?: string;
  id?: string;
}): string {
  const { type, title, body, id } = opts;
  const source = type === "article" ? title ?? "" : (body ?? "").slice(0, 60);
  let base = slugify(source);
  if (!base) base = type;
  if (type === "post") {
    const suffix = (id ?? "").replace(/-/g, "").slice(0, 8) ||
      Math.random().toString(36).slice(2, 10);
    return `${base}-${suffix}`;
  }
  return base;
}

/** Detect if a string looks like a UUID. Used for backward-compat routing. */
export function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
