-- Fix search_path on calculate_next_donation_date function
CREATE OR REPLACE FUNCTION public.calculate_next_donation_date(last_donation date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN last_donation + INTERVAL '90 days';
END;
$$;