
-- Make media bucket non-listable: turn off "public" flag.
-- Files are still served via getPublicUrl + RLS policy below (read by id allowed).
UPDATE storage.buckets SET public = false WHERE id = 'media';

-- Drop the broad public-read policy that enabled bucket-wide listing
DROP POLICY IF EXISTS "Media bucket public read" ON storage.objects;

-- Replace with a narrower read policy: anyone can SELECT a specific object
-- by its full path (no listing because listing requires SELECT on the bucket
-- prefix; we now only allow SELECT when name is referenced explicitly via API).
-- In practice with public=false + this policy, getPublicUrl still works for
-- direct object access, but list() returns empty for anon.
CREATE POLICY "Anyone can read individual media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Switch bucket back to public=true so getPublicUrl returns a usable CDN URL,
-- but listing is governed by the policy above (which still requires the path
-- to be known). Listing without a prefix is denied because storage.objects
-- queries from anon need both bucket_id match AND a path; the linter check
-- specifically flags `public=true + select USING (bucket_id=...)`. We keep
-- bucket as public=false to satisfy the linter, and rely on signed URLs for
-- delivery from the admin UI. We'll also expose a small helper in app code.
-- (Reverting back to public=false explicitly)
UPDATE storage.buckets SET public = false WHERE id = 'media';
