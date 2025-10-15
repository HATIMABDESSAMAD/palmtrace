-- Update the handle_new_user function to NOT automatically create a viewer role
-- The role will be set by the user's choice on the auth page
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create profile, don't auto-assign viewer role
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$function$;