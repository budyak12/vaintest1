CREATE TABLE public.visit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  path text,
  ip_hash text
);

ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view visit logs"
ON public.visit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX visit_logs_created_at_idx ON public.visit_logs (created_at DESC);