-- Add slug + show_cover_on_article columns to entries
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS show_cover_on_article boolean NOT NULL DEFAULT true;

-- Cyrillic transliteration + slugify (immutable, safe in expressions)
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _input IS NULL THEN RETURN ''; END IF;
  s := lower(_input);
  -- Cyrillic transliteration
  s := translate(s,
    'абвгдеёзийклмнопрстуфхыэАБВГДЕЁЗИЙКЛМНОПРСТУФХЫЭ',
    'abvgdeezijklmnoprstufhyeabvgdeezijklmnoprstufhye');
  s := replace(s, 'ж', 'zh');
  s := replace(s, 'ц', 'c');
  s := replace(s, 'ч', 'ch');
  s := replace(s, 'ш', 'sh');
  s := replace(s, 'щ', 'sch');
  s := replace(s, 'ъ', '');
  s := replace(s, 'ь', '');
  s := replace(s, 'ю', 'yu');
  s := replace(s, 'я', 'ya');
  s := replace(s, 'Ж', 'zh');
  s := replace(s, 'Ц', 'c');
  s := replace(s, 'Ч', 'ch');
  s := replace(s, 'Ш', 'sh');
  s := replace(s, 'Щ', 'sch');
  s := replace(s, 'Ъ', '');
  s := replace(s, 'Ь', '');
  s := replace(s, 'Ю', 'yu');
  s := replace(s, 'Я', 'ya');
  -- Replace non-alphanumeric with hyphens
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := substring(s from 1 for 80);
  RETURN s;
END;
$$;

-- Backfill slugs for existing entries
DO $$
DECLARE
  r record;
  base_slug text;
  candidate text;
  suffix text;
  n int;
BEGIN
  FOR r IN SELECT id, type, title, body FROM public.entries WHERE slug IS NULL OR slug = '' LOOP
    suffix := substring(replace(r.id::text, '-', '') from 1 for 8);
    IF r.type = 'article' THEN
      base_slug := public.slugify(coalesce(r.title, ''));
    ELSE
      base_slug := public.slugify(substring(coalesce(r.body, '') from 1 for 60));
    END IF;
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := r.type;
    END IF;
    -- For posts, always append id suffix for uniqueness/readability
    IF r.type = 'post' THEN
      candidate := base_slug || '-' || suffix;
    ELSE
      candidate := base_slug;
    END IF;
    -- Ensure uniqueness
    n := 0;
    WHILE EXISTS (SELECT 1 FROM public.entries WHERE slug = candidate AND id <> r.id) LOOP
      n := n + 1;
      candidate := base_slug || '-' || suffix || CASE WHEN n > 0 THEN '-' || n::text ELSE '' END;
    END LOOP;
    UPDATE public.entries SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- Unique index for slug (allow nulls during transition; future inserts always set it)
CREATE UNIQUE INDEX IF NOT EXISTS entries_slug_unique ON public.entries (slug) WHERE slug IS NOT NULL;
