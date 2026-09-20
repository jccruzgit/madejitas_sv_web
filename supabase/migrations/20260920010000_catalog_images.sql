insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-images', 'catalog-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload catalog images" on storage.objects;
create policy "Admins can upload catalog images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog-images'
    and (storage.foldername(name))[1] = 'catalog'
    and exists (
      select 1 from public.app_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can inspect catalog images" on storage.objects;
create policy "Admins can inspect catalog images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'catalog-images'
    and exists (
      select 1 from public.app_admins
      where user_id = (select auth.uid())
    )
  );
