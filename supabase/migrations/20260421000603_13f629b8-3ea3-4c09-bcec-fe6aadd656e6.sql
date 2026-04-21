insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = true;

create policy "Public read post-media"
on storage.objects for select
using (bucket_id = 'post-media');

create policy "Authenticated upload post-media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated update own post-media"
on storage.objects for update
to authenticated
using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Authenticated delete own post-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);