-- Creator Insights support.
-- 1) Snapshot the author's fan type on each post, so insights can compare what new fans ask for
--    with what returning fans ask for (seed posts set it directly).
alter table public.posts
  add column author_fan_type text check (author_fan_type in ('new', 'returning'));

create or replace function public.on_post_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.source = 'platform' and new.author_id is not null then
    if (select count(*) from public.posts
        where author_id = new.author_id and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'Daily post limit reached (10). Come back tomorrow.';
    end if;
    new.author_fan_type := (select fan_type from public.profiles where id = new.author_id);
  end if;
  return new;
end
$$;

-- 2) Recreate the feed view so it picks up the new column (views freeze their column list).
drop view if exists public.posts_feed;
create view public.posts_feed
with (security_invoker = true)
as
select
  p.*,
  pr.username     as author_username,
  pr.avatar_url   as author_avatar,
  c.name          as creator_name,
  (p.upvote_count + 1)
    / power(extract(epoch from (now() - p.created_at)) / 3600 + 2, 1.5) as hot
from public.posts p
left join public.profiles pr on pr.id = p.author_id
left join public.creators c  on c.id = p.creator_id;

-- 3) Themes are rebuilt wholesale by the grouping job; let it replace a creator's set cleanly.
create index if not exists themes_creator_idx on public.themes (creator_id);
