-- Drop and recreate the handle_new_user function to properly handle user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, team_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'fullName', 'New User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'driver'),
    NEW.raw_user_meta_data ->> 'teamName'
  );
  RETURN NEW;
END;
$function$;