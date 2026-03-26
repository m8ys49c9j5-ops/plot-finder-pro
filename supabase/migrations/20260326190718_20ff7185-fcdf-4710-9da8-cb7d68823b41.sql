CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role) to insert; no public access needed
CREATE POLICY "Service role can insert contact messages"
ON public.contact_messages
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can select contact messages"
ON public.contact_messages
FOR SELECT
TO service_role
USING (true);