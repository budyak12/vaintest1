-- Attach the handle_new_user trigger that was missing
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profile rows for any auth.users that don't have one yet
INSERT INTO public.profiles (id, username, display_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'username', ''),
    split_part(u.email, '@', 1)
  ) AS uname,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'username', ''),
    split_part(u.email, '@', 1)
  ) AS dname
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill username/display_name for profile rows that have NULLs
UPDATE public.profiles p
SET
  username = COALESCE(p.username, NULLIF(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1)),
  display_name = COALESCE(p.display_name, p.username, NULLIF(u.raw_user_meta_data->>'username', ''), split_part(u.email, '@', 1))
FROM auth.users u
WHERE u.id = p.id
  AND (p.username IS NULL OR p.display_name IS NULL);

-- Allow users to update their own username (currently profile.tsx shows it as read-only,
-- but at least let the column be set by the user via the existing UPDATE policy).
-- The existing "Users can update their own profile" policy already covers this.
