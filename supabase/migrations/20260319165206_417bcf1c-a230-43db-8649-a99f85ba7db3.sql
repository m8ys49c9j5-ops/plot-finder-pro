
-- 1a. RPC: paginated user list with all per-user stats for admin
CREATE OR REPLACE FUNCTION public.admin_user_list(
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0,
  p_search_email text DEFAULT NULL,
  p_filter_purchased boolean DEFAULT NULL,
  p_sort_by text DEFAULT 'last_active'
)
RETURNS TABLE(
  user_id uuid,
  email text,
  registered_at timestamptz,
  last_active timestamptz,
  total_searches bigint,
  searches_last_30d bigint,
  credits_remaining integer,
  total_spent numeric,
  ever_purchased boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      u.id AS uid,
      u.email::text AS uemail,
      u.created_at AS ureg,
      GREATEST(
        MAX(sh.created_at),
        u.created_at
      ) AS ulast_active,
      COUNT(sh.id) AS utotal_searches,
      COUNT(sh.id) FILTER (
        WHERE sh.created_at >= now() - interval '30 days'
      ) AS usearches_30d,
      COALESCE(uc.credits, 0) AS ucredits,
      COALESCE(SUM(pl.amount_eur), 0) AS uspent,
      (COUNT(pl.id) > 0) AS upurchased
    FROM auth.users u
    LEFT JOIN public.search_history sh
      ON sh.user_id = u.id AND sh.is_anonymous = false
    LEFT JOIN public.user_credits uc
      ON uc.user_id = u.id
    LEFT JOIN public.payment_logs pl
      ON pl.user_id = u.id
    WHERE
      (p_search_email IS NULL OR u.email ILIKE '%' || p_search_email || '%')
    GROUP BY u.id, u.email, u.created_at, uc.credits
  ),
  filtered AS (
    SELECT *,
      COUNT(*) OVER () AS total_cnt
    FROM user_stats
    WHERE
      p_filter_purchased IS NULL
      OR (p_filter_purchased = true AND upurchased = true)
      OR (p_filter_purchased = false AND upurchased = false)
  )
  SELECT
    f.uid,
    f.uemail,
    f.ureg,
    f.ulast_active,
    f.utotal_searches,
    f.usearches_30d,
    f.ucredits,
    f.uspent,
    f.upurchased,
    f.total_cnt
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort_by = 'last_active'    THEN EXTRACT(EPOCH FROM f.ulast_active) END DESC,
    CASE WHEN p_sort_by = 'most_searches'  THEN f.utotal_searches END DESC,
    CASE WHEN p_sort_by = 'highest_spend'  THEN f.uspent END DESC,
    f.ureg DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 1b. RPC: get all searches for a specific user (admin drill-down)
CREATE OR REPLACE FUNCTION public.admin_user_searches(
  p_user_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  cadastral_number text,
  address text,
  lat double precision,
  lng double precision,
  is_unlocked boolean,
  search_method text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sh.id,
    sh.cadastral_number,
    sh.address,
    sh.lat,
    sh.lng,
    sh.is_unlocked,
    sh.search_method,
    sh.created_at,
    COUNT(*) OVER () AS total_count
  FROM public.search_history sh
  WHERE sh.user_id = p_user_id
  ORDER BY sh.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- 1c. RPC: get account summary for logged-in user
CREATE OR REPLACE FUNCTION public.my_account_summary(p_user_id uuid)
RETURNS TABLE(
  email text,
  registered_at timestamptz,
  total_searches bigint,
  credits_remaining integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.email::text,
    u.created_at AS registered_at,
    COUNT(sh.id) AS total_searches,
    COALESCE(uc.credits, 0) AS credits_remaining
  FROM auth.users u
  LEFT JOIN public.search_history sh
    ON sh.user_id = u.id AND sh.is_anonymous = false
  LEFT JOIN public.user_credits uc
    ON uc.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.email, u.created_at, uc.credits;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.admin_user_list TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_searches TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_account_summary TO authenticated;

-- Allow search_history delete for own rows
CREATE POLICY "Users can delete own search history"
ON public.search_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
