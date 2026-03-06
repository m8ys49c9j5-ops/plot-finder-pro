
-- 1. Create search_history table
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cadastral_number text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, cadastral_number)
);

-- 2. Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can read own search history"
  ON public.search_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages search history"
  ON public.search_history FOR ALL
  TO service_role
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- 4. Create unlock_parcel RPC function
CREATE OR REPLACE FUNCTION public.unlock_parcel(p_user_id uuid, p_cadastral_number text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already boolean;
  v_credits integer;
BEGIN
  -- Check if already unlocked
  SELECT EXISTS (
    SELECT 1 FROM public.search_history
    WHERE user_id = p_user_id AND cadastral_number = p_cadastral_number
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('status', 'already_unlocked');
  END IF;

  -- Check credits
  SELECT credits INTO v_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_credits IS NULL OR v_credits <= 0 THEN
    RETURN jsonb_build_object('status', 'insufficient_credits');
  END IF;

  -- Deduct credit
  UPDATE public.user_credits
  SET credits = credits - 1, updated_at = now()
  WHERE user_id = p_user_id;

  -- Record in search history
  INSERT INTO public.search_history (user_id, cadastral_number)
  VALUES (p_user_id, p_cadastral_number);

  RETURN jsonb_build_object('status', 'success');
END;
$$;
