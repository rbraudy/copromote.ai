create table public.warranty_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  current_price integer not null default 199,
  status text not null default 'active', -- active, discounted, paid
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.warranty_sessions enable row level security;

-- Allow public read access (for Demo simplicity)
create policy "Allow public read access"
  on public.warranty_sessions
  for select
  to public
  using (true);

-- Allow Edge Functions (service_role) to update
create policy "Allow service role update"
  on public.warranty_sessions
  for update
  to service_role
  using (true)
  with check (true);

-- Allow public insert (for Demo simplicity, if needed)
create policy "Allow public insert"
  on public.warranty_sessions
  for insert
  to public
  with check (true);
