-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Creates the page_views table and a SECURITY DEFINER function so the
-- public anon key can increment counts without gaining direct write access.

create table if not exists page_views (
  slug text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table page_views enable row level security;

drop policy if exists "Allow public read of page_views" on page_views;
create policy "Allow public read of page_views"
  on page_views for select
  using (true);

create or replace function increment_page_view(slug_input text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_views bigint;
begin
  insert into page_views (slug, views)
  values (slug_input, 1)
  on conflict (slug) do update
    set views = page_views.views + 1,
        updated_at = now()
  returning views into new_views;
  return new_views;
end;
$$;

revoke all on function increment_page_view(text) from public;
grant execute on function increment_page_view(text) to anon, authenticated;
grant select on page_views to anon, authenticated;
