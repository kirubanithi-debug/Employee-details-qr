-- 1. Create Employee Profiles Table
create table if not exists public.employee_profiles (
  id text primary key,
  photo_url text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.employee_profiles enable row level security;

-- Allow public read access to employee profiles
create policy "Allow public read access to employee profiles"
  on public.employee_profiles for select
  using (true);

-- Allow public insert access to create employee profiles
create policy "Allow public insert access to employee profiles"
  on public.employee_profiles for insert
  with check (true);

-- 2. Setup Storage Bucket for Employee Photos
insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do nothing;

-- Storage Bucket Policies for Public Access
create policy "Allow public read access to employee photos"
  on storage.objects for select
  using (bucket_id = 'employee-photos');

create policy "Allow public upload access to employee photos"
  on storage.objects for insert
  with check (bucket_id = 'employee-photos');
