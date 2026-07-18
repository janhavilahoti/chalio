
-- Allow the coin-award path to bypass the profile guard via a session-scoped flag
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF auth.role() = 'service_role'
     OR public.is_admin(auth.uid())
     OR current_setting('app.coin_award', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
     OR NEW.admin_note IS DISTINCT FROM OLD.admin_note
     OR NEW.leaderboard_excluded IS DISTINCT FROM OLD.leaderboard_excluded THEN
    RAISE EXCEPTION 'Not allowed to modify protected profile fields';
  END IF;

  -- Non-admin users can never directly change their own coin balance from client code
  IF NEW.coins IS DISTINCT FROM OLD.coins THEN
    RAISE EXCEPTION 'Coin balance can only be changed via award_coins';
  END IF;

  RETURN NEW;
END;
$function$;

-- Trusted RPC: log the transaction + increment coins atomically, bypassing the guard
CREATE OR REPLACE FUNCTION public.award_coins(
  _user uuid,
  _amount integer,
  _reason text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_balance integer;
BEGIN
  -- Only the user themselves (or service_role/admin) may award coins to themselves
  IF auth.uid() IS DISTINCT FROM _user
     AND auth.role() <> 'service_role'
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to award coins to another user';
  END IF;

  IF _amount IS NULL OR _amount = 0 THEN
    SELECT coins INTO new_balance FROM public.profiles WHERE id = _user;
    RETURN COALESCE(new_balance, 0);
  END IF;

  INSERT INTO public.coin_transactions (user_id, amount, reason, metadata)
  VALUES (_user, _amount, _reason, COALESCE(_metadata, '{}'::jsonb));

  PERFORM set_config('app.coin_award', '1', true);
  UPDATE public.profiles
     SET coins = COALESCE(coins, 0) + _amount
   WHERE id = _user
  RETURNING coins INTO new_balance;
  PERFORM set_config('app.coin_award', '0', true);

  RETURN COALESCE(new_balance, 0);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.award_coins(uuid, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_coins(uuid, integer, text, jsonb) TO authenticated, service_role;

-- Reconcile: set every profile's coins to the sum of its transactions
DO $$
BEGIN
  PERFORM set_config('app.coin_award', '1', true);
  UPDATE public.profiles p
     SET coins = COALESCE(t.total, 0)
    FROM (
      SELECT user_id, SUM(amount)::int AS total
        FROM public.coin_transactions
       GROUP BY user_id
    ) t
   WHERE p.id = t.user_id;
  PERFORM set_config('app.coin_award', '0', true);
END $$;
