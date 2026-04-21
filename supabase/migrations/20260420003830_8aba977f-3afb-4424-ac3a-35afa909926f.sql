CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uname TEXT;
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, uname, uname)
  ON CONFLICT (id) DO NOTHING;

  IF uname IN ('vainadminka', 'vain') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'reader')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;