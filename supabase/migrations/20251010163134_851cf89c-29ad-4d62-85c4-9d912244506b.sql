-- Fix security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION public.update_parcels_trees_report_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;