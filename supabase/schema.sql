-- Run this once in Supabase: SQL Editor → New query → paste all of this → Run.

-- ---------- Letters ----------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users on delete cascade,
  from_name text not null,
  title text not null default '',
  elements jsonb not null default '[]',   -- the text boxes and photos on the page
  draft boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.letters enable row level security;

-- Signed-in users see every sent letter, plus their own drafts
create policy "read sent letters and own drafts" on public.letters
  for select to authenticated
  using (draft = false or author_id = auth.uid());

-- You can only create, change and delete letters you wrote
create policy "create own letters" on public.letters
  for insert to authenticated with check (author_id = auth.uid());
create policy "update own letters" on public.letters
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own letters" on public.letters
  for delete to authenticated using (author_id = auth.uid());

grant select, insert, update, delete on public.letters to authenticated;

-- ---------- Stars (each person has their own) ----------
create table public.stars (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  letter_id uuid not null references public.letters on delete cascade,
  primary key (user_id, letter_id)
);

alter table public.stars enable row level security;

create policy "own stars" on public.stars
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.stars to authenticated;

-- ---------- Photos (private; only signed-in users can see them) ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false);

create policy "read photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

-- Each person uploads into a folder named after their user id
create policy "upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
