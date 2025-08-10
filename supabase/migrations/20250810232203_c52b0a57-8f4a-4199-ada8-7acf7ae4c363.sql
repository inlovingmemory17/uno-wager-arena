-- Top wagers public function to expose open matches stakes for leaderboard
CREATE OR REPLACE FUNCTION public.get_top_wagers(limit_count int DEFAULT 20)
RETURNS TABLE (
  display_name text,
  amount numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(p.display_name, 'player') AS display_name,
    m.stake_amount AS amount,
    m.created_at
  FROM public.matches m
  JOIN public.profiles p ON p.id = m.player1_id
  WHERE m.status = 'open'
  ORDER BY m.stake_amount DESC, m.created_at DESC
  LIMIT limit_count;
$$;