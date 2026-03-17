
CREATE TABLE public.search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_input text NOT NULL,
  search_type text NOT NULL DEFAULT 'text_search',
  is_successful boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert search_analytics"
  ON public.search_analytics
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Service role manages search_analytics"
  ON public.search_analytics
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
