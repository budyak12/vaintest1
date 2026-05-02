-- Stickers table for Telegram-style .webm video stickers.
CREATE TABLE public.stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  alt TEXT,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  size_bytes INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stickers are viewable by everyone"
  ON public.stickers FOR SELECT USING (true);

CREATE POLICY "Admins can manage stickers"
  ON public.stickers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_stickers_created_at ON public.stickers(created_at DESC);
