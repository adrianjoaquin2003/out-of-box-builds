-- Add INSERT policy for teams table so users can create teams
CREATE POLICY "Anyone can create a team"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update the handle_new_user function to handle invalid roles gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Safely cast the role, defaulting to 'driver' if invalid or null
  BEGIN
    user_role_value := (NEW.raw_user_meta_data ->> 'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    user_role_value := 'driver'::user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role, team_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    user_role_value,
    NEW.raw_user_meta_data ->> 'team_name'
  );
  RETURN NEW;
END;
$$;