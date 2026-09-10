-- monote: PostgreSQL schema for Supabase
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- notes
-- ─────────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled',
  content     text not null default '',        -- Markdown source
  tags        text[] not null default '{}',    -- denormalized text tags for fast reads
  pinned      boolean not null default false,
  archived    boolean not null default false,
  trashed     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_updated_at_idx on public.notes (updated_at desc);
create index if not exists notes_tags_idx on public.notes using gin (tags);

-- ─────────────────────────────────────────────
-- tags
-- Optional normalized table, useful if you later want per-tag color,
-- usage counts, or renaming a tag across all notes in one write.
-- ─────────────────────────────────────────────
create table if not exists public.tags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ─────────────────────────────────────────────
-- updated_at auto-touch trigger
-- ─────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security — each user only ever sees their own rows
-- ─────────────────────────────────────────────
alter table public.notes enable row level security;
alter table public.tags enable row level security;

create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

create policy "tags_select_own" on public.tags
  for select using (auth.uid() = user_id);
create policy "tags_insert_own" on public.tags
  for insert with check (auth.uid() = user_id);
create policy "tags_update_own" on public.tags
  for update using (auth.uid() = user_id);
create policy "tags_delete_own" on public.tags
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Realtime — allow the notes table to broadcast changes
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.notes;
