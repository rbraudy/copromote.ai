-- Create a new storage bucket for vignettes
insert into storage.buckets (id, name, public)
values ('vignettes', 'vignettes', true)
on conflict (id) do nothing;

-- Set up security policies for the vignettes bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'vignettes' );

create policy "Authenticated Users Can Upload"
  on storage.objects for insert
  with check ( bucket_id = 'vignettes' and auth.role() = 'authenticated' );

create policy "Service Role Can Do Everything"
  on storage.objects for all
  using ( bucket_id = 'vignettes' and auth.role() = 'service_role' );
