-- Faze Now core schema
-- Profiles, points, Clip Court (Elo matchmaking + brackets), The Call (polls/requests),
-- creator insights tables, notifications, storage buckets, RLS.
--
-- Write model: clients only write through narrow column grants + RLS, or through
-- SECURITY DEFINER functions that validate input (voting, Elo, brackets, admin actions).
-- Counters and points are only ever changed by triggers/functions, never by clients.

-- ───────────────────────────── Profiles ─────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  fan_type      text check (fan_type in ('returning', 'new')),
  era           text,
  points        integer not null default 0,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Create a profile on first sign-in (Discord metadata: user_name / name / full_name / avatar_url)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'fan'),
    '[^a-zA-Z0-9_]', '', 'g'));
  if base is null or base = '' then base := 'fan'; end if;
  base := left(base, 24);

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', candidate),
    new.raw_user_meta_data ->> 'avatar_url');
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── Creators ─────────────────────────────

create table public.creators (
  id                  text primary key,          -- slug, e.g. 'swagg'
  name                text not null,             -- display name, e.g. 'FaZe Swagg'
  handle              text,                      -- YouTube handle, e.g. '@Swagg'
  youtube_channel_id  text,
  avatar_url          text,
  sort                integer not null default 0,
  created_at          timestamptz not null default now()
);

-- ───────────────────────────── Points ─────────────────────────────

create table public.points_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at desc);

create or replace function public.apply_points()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set points = points + new.amount where id = new.user_id;
  return new;
end
$$;

create trigger points_ledger_apply
  after insert on public.points_ledger
  for each row execute function public.apply_points();

-- ───────────────────────────── Clip Court ─────────────────────────────

create table public.clips (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references public.profiles (id) on delete set null default auth.uid(),
  creator_label  text,                -- shown when a seeded clip has no account
  title          text not null check (char_length(title) between 1 and 80),
  category       text not null check (category in ('trickshot', 'montage', 'funny', 'tribute')),
  video_path     text not null,       -- path inside the 'clips' bucket
  thumb_path     text,                -- path inside the 'thumbs' bucket
  duration_s     numeric,
  orientation    text not null default 'vertical' check (orientation in ('vertical', 'horizontal')),
  rating         numeric not null default 1000,
  matches        integer not null default 0,
  wins           integer not null default 0,
  impressions    integer not null default 0,
  status         text not null default 'active' check (status in ('active', 'removed')),
  season         integer not null default 1,
  created_at     timestamptz not null default now()
);
create index clips_matchmaking_idx on public.clips (category, status, impressions);
create index clips_rating_idx on public.clips (category, rating desc);

create table public.clip_votes (
  id          bigint generated always as identity primary key,
  voter_id    uuid not null references public.profiles (id) on delete cascade,
  clip_a      uuid not null references public.clips (id) on delete cascade,
  clip_b      uuid not null references public.clips (id) on delete cascade,
  winner_id   uuid not null references public.clips (id) on delete cascade,
  watched_a   numeric,
  watched_b   numeric,
  created_at  timestamptz not null default now(),
  check (clip_a <> clip_b),
  check (winner_id in (clip_a, clip_b))
);
-- One vote per voter per unordered pair
create unique index clip_votes_pair_uniq
  on public.clip_votes (voter_id, least(clip_a, clip_b), greatest(clip_a, clip_b));

-- Fair-exposure matchmaking: least-seen clip first, opponent with the closest rating,
-- never your own clip, never a pair you've already judged.
create or replace function public.next_matchup(p_category text default null)
returns setof public.clips
language plpgsql security definer set search_path = public
as $$
declare
  v     uuid := auth.uid();
  a     public.clips;
  b_id  uuid;
begin
  if v is null then
    raise exception 'Sign in to vote' using errcode = '28000';
  end if;

  for a in
    select * from public.clips c
    where c.status = 'active'
      and (p_category is null or c.category = p_category)
      and c.owner_id is distinct from v
    order by c.impressions asc, random()
    limit 25
  loop
    select c.id into b_id
    from public.clips c
    where c.status = 'active'
      and c.category = a.category
      and c.id <> a.id
      and c.owner_id is distinct from v
      and not exists (
        select 1 from public.clip_votes cv
        where cv.voter_id = v
          and least(cv.clip_a, cv.clip_b) = least(a.id, c.id)
          and greatest(cv.clip_a, cv.clip_b) = greatest(a.id, c.id))
    order by abs(c.rating - a.rating) + random() * 100
    limit 1;

    if b_id is not null then
      update public.clips set impressions = impressions + 1 where id in (a.id, b_id);
      return query
        select * from public.clips where id in (a.id, b_id) order by (id = a.id) desc;
      return;
    end if;
  end loop;

  return; -- voter has judged every available pair
end
$$;

-- Validates the vote, records it, updates both Elo ratings (K = 32), awards points.
create or replace function public.cast_clip_vote(
  p_clip_a    uuid,
  p_clip_b    uuid,
  p_winner    uuid,
  p_watched_a numeric default 0,
  p_watched_b numeric default 0)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v      uuid := auth.uid();
  ca     public.clips;
  cb     public.clips;
  k      constant numeric := 32;
  ea     numeric;
  sa     integer;
  new_a  numeric;
  new_b  numeric;
begin
  if v is null then
    raise exception 'Sign in to vote' using errcode = '28000';
  end if;
  if p_clip_a = p_clip_b or p_winner not in (p_clip_a, p_clip_b) then
    raise exception 'Invalid vote';
  end if;

  select * into ca from public.clips where id = p_clip_a and status = 'active' for update;
  select * into cb from public.clips where id = p_clip_b and status = 'active' for update;
  if ca.id is null or cb.id is null then
    raise exception 'Clip not available';
  end if;
  if ca.owner_id = v or cb.owner_id = v then
    raise exception 'You cannot vote on your own clip';
  end if;
  -- Must have watched ~10s of each clip (or all of it, if shorter)
  if coalesce(p_watched_a, 0) < least(10, coalesce(ca.duration_s, 10)) - 1
     or coalesce(p_watched_b, 0) < least(10, coalesce(cb.duration_s, 10)) - 1 then
    raise exception 'Watch both clips before voting';
  end if;

  begin
    insert into public.clip_votes (voter_id, clip_a, clip_b, winner_id, watched_a, watched_b)
    values (v, p_clip_a, p_clip_b, p_winner, p_watched_a, p_watched_b);
  exception when unique_violation then
    raise exception 'You already judged this matchup';
  end;

  ea := 1 / (1 + power(10::numeric, (cb.rating - ca.rating) / 400));
  sa := case when p_winner = p_clip_a then 1 else 0 end;
  new_a := round(ca.rating + k * (sa - ea), 2);
  new_b := round(cb.rating + k * ((1 - sa) - (1 - ea)), 2);

  update public.clips set rating = new_a, matches = matches + 1, wins = wins + sa       where id = ca.id;
  update public.clips set rating = new_b, matches = matches + 1, wins = wins + (1 - sa) where id = cb.id;

  insert into public.points_ledger (user_id, amount, reason, ref_id)
  values (v, 2, 'clip_vote', p_winner);

  return jsonb_build_object('rating_a', new_a, 'rating_b', new_b, 'points', 2);
end
$$;

-- ───────────────────────────── Brackets ─────────────────────────────

create table public.brackets (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  category       text not null check (category in ('trickshot', 'montage', 'funny', 'tribute')),
  season         integer not null default 1,
  size           integer not null check (size in (4, 8, 16, 32)),
  status         text not null default 'active' check (status in ('active', 'complete')),
  current_round  integer not null default 1,
  champion_id    uuid references public.clips (id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.bracket_matches (
  id          uuid primary key default gen_random_uuid(),
  bracket_id  uuid not null references public.brackets (id) on delete cascade,
  round       integer not null,
  slot        integer not null,
  clip_a      uuid references public.clips (id) on delete set null,
  clip_b      uuid references public.clips (id) on delete set null,
  winner_id   uuid references public.clips (id) on delete set null,
  votes_a     integer not null default 0,
  votes_b     integer not null default 0,
  status      text not null default 'open' check (status in ('open', 'closed')),
  unique (bracket_id, round, slot)
);

create table public.bracket_votes (
  match_id    uuid not null references public.bracket_matches (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  choice      uuid not null references public.clips (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (match_id, user_id)
);

create or replace function public.on_bracket_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m public.bracket_matches;
begin
  select * into m from public.bracket_matches where id = new.match_id for update;
  if m.id is null or m.status <> 'open' then
    raise exception 'This match is closed';
  end if;
  if new.choice = m.clip_a then
    update public.bracket_matches set votes_a = votes_a + 1 where id = m.id;
  elsif new.choice = m.clip_b then
    update public.bracket_matches set votes_b = votes_b + 1 where id = m.id;
  else
    raise exception 'Invalid choice';
  end if;
  insert into public.points_ledger (user_id, amount, reason, ref_id)
  values (new.user_id, 2, 'bracket_vote', new.match_id);
  return new;
end
$$;

create trigger bracket_votes_count
  before insert on public.bracket_votes
  for each row execute function public.on_bracket_vote();

-- Seeds the top-N clips of a category by rating, standard seeding (1 and 2 meet only in the final).
create or replace function public.create_bracket(p_category text, p_size integer, p_title text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  seeds   uuid[];
  order_  integer[] := array[1, 2];
  nxt     integer[];
  n       integer;
  s       integer;
  b_id    uuid;
  i       integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_size not in (4, 8, 16, 32) then raise exception 'Bracket size must be 4, 8, 16 or 32'; end if;

  select array_agg(id order by rating desc) into seeds
  from (select id, rating from public.clips
        where status = 'active' and category = p_category
        order by rating desc limit p_size) top;
  if coalesce(array_length(seeds, 1), 0) < p_size then
    raise exception 'Not enough % clips for a bracket of %', p_category, p_size;
  end if;

  -- Build seed order: [1,2] -> [1,4,2,3] -> [1,8,4,5,2,7,3,6] ...
  n := 2;
  while n < p_size loop
    n := n * 2;
    nxt := '{}';
    foreach s in array order_ loop
      nxt := nxt || s || (n + 1 - s);
    end loop;
    order_ := nxt;
  end loop;

  insert into public.brackets (title, category, size)
  values (p_title, p_category, p_size)
  returning id into b_id;

  for i in 0 .. (p_size / 2 - 1) loop
    insert into public.bracket_matches (bracket_id, round, slot, clip_a, clip_b)
    values (b_id, 1, i, seeds[order_[2 * i + 1]], seeds[order_[2 * i + 2]]);
  end loop;

  return b_id;
end
$$;

-- Closes the current round (most votes wins, tie -> higher rating), opens the next.
-- On the final: crowns the champion, pays the clip owner, and pays Scouts who backed
-- the champion in round 1.
create or replace function public.advance_bracket(p_bracket uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  b        public.brackets;
  m        record;
  winners  uuid[] := '{}';
  w        uuid;
  i        integer;
  champ    public.clips;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select * into b from public.brackets where id = p_bracket for update;
  if b.id is null or b.status <> 'active' then raise exception 'Bracket is not active'; end if;

  for m in
    select bm.*, ca.rating as ra, cb.rating as rb
    from public.bracket_matches bm
    left join public.clips ca on ca.id = bm.clip_a
    left join public.clips cb on cb.id = bm.clip_b
    where bm.bracket_id = b.id and bm.round = b.current_round
    order by bm.slot
  loop
    w := case
           when m.votes_a > m.votes_b then m.clip_a
           when m.votes_b > m.votes_a then m.clip_b
           when coalesce(m.ra, 0) >= coalesce(m.rb, 0) then m.clip_a
           else m.clip_b
         end;
    update public.bracket_matches set winner_id = w, status = 'closed' where id = m.id;
    winners := winners || w;
  end loop;

  if array_length(winners, 1) = 1 then
    update public.brackets set status = 'complete', champion_id = winners[1] where id = b.id;
    select * into champ from public.clips where id = winners[1];

    if champ.owner_id is not null then
      insert into public.points_ledger (user_id, amount, reason, ref_id)
      values (champ.owner_id, 1000, 'bracket_champion', b.id);
    end if;

    insert into public.points_ledger (user_id, amount, reason, ref_id)
    select bv.user_id, 100, 'scout', b.id
    from public.bracket_votes bv
    join public.bracket_matches bm on bm.id = bv.match_id
    where bm.bracket_id = b.id and bm.round = 1 and bv.choice = champ.id;

    return jsonb_build_object('status', 'complete', 'champion', champ.id);
  end if;

  for i in 0 .. (array_length(winners, 1) / 2 - 1) loop
    insert into public.bracket_matches (bracket_id, round, slot, clip_a, clip_b)
    values (b.id, b.current_round + 1, i, winners[2 * i + 1], winners[2 * i + 2]);
  end loop;
  update public.brackets set current_round = current_round + 1 where id = b.id;

  return jsonb_build_object('status', 'active', 'round', b.current_round + 1);
end
$$;

-- ───────────────────────────── The Call ─────────────────────────────

create table public.themes (
  id             uuid primary key default gen_random_uuid(),
  creator_id     text references public.creators (id) on delete cascade,
  label          text not null,
  summary        text,
  post_count     integer not null default 0,
  total_support  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.posts (
  id                  uuid primary key default gen_random_uuid(),
  author_id           uuid references public.profiles (id) on delete set null default auth.uid(),
  type                text not null check (type in ('poll', 'request')),
  body                text not null check (char_length(body) between 5 and 280),
  creator_id          text references public.creators (id) on delete set null,
  status              text not null default 'open'
                        check (status in ('open', 'seen', 'considering', 'fulfilled', 'removed')),
  source              text not null default 'platform' check (source in ('platform', 'youtube', 'seed')),
  source_ref          text unique,      -- e.g. YouTube comment id
  source_author       text,
  source_likes        integer,
  theme_id            uuid references public.themes (id) on delete set null,
  featured_week       date,             -- set when picked for the weekly in-video segment
  upvote_count        integer not null default 0,
  yes_count           integer not null default 0,
  no_count            integer not null default 0,
  fulfilled_video_id  text,
  fulfilled_at        timestamptz,
  created_at          timestamptz not null default now()
);
create index posts_feed_idx on public.posts (status, created_at desc);
create index posts_creator_idx on public.posts (creator_id, upvote_count desc);
create index posts_theme_idx on public.posts (theme_id);

create table public.post_upvotes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_upvotes_user_idx on public.post_upvotes (user_id);

create table public.poll_votes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  choice      text not null check (choice in ('yes', 'no')),
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.creator_summaries (
  creator_id    text not null references public.creators (id) on delete cascade,
  week_of       date not null,
  summary       text not null,
  generated_at  timestamptz not null default now(),
  primary key (creator_id, week_of)
);

create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  post_id     uuid references public.posts (id) on delete cascade,
  body        text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- New post: rate limit (10 per 24h) and +5 points to the author
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
  end if;
  return new;
end
$$;

create trigger posts_rate_limit
  before insert on public.posts
  for each row execute function public.on_post_insert();

create or replace function public.on_post_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.source = 'platform' and new.author_id is not null then
    insert into public.points_ledger (user_id, amount, reason, ref_id)
    values (new.author_id, 5, 'post', new.id);
  end if;
  return new;
end
$$;

create trigger posts_award_points
  after insert on public.posts
  for each row execute function public.on_post_created();

-- Upvotes: keep the counter in sync; author earns +1 per upvote (and loses it on un-upvote)
create or replace function public.on_post_upvote()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set upvote_count = upvote_count + 1 where id = new.post_id
    returning author_id into author;
    if author is not null and author <> new.user_id then
      insert into public.points_ledger (user_id, amount, reason, ref_id)
      values (author, 1, 'upvote_received', new.post_id);
    end if;
    return new;
  else
    update public.posts set upvote_count = greatest(upvote_count - 1, 0) where id = old.post_id
    returning author_id into author;
    if author is not null and author <> old.user_id then
      insert into public.points_ledger (user_id, amount, reason, ref_id)
      values (author, -1, 'upvote_removed', old.post_id);
    end if;
    return old;
  end if;
end
$$;

create trigger post_upvotes_count
  after insert or delete on public.post_upvotes
  for each row execute function public.on_post_upvote();

-- Poll votes: polls only, one per user (PK), +1 point
create or replace function public.on_poll_vote()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (select type from public.posts where id = new.post_id) is distinct from 'poll' then
    raise exception 'Only polls take yes/no votes';
  end if;
  if new.choice = 'yes' then
    update public.posts set yes_count = yes_count + 1 where id = new.post_id;
  else
    update public.posts set no_count = no_count + 1 where id = new.post_id;
  end if;
  insert into public.points_ledger (user_id, amount, reason, ref_id)
  values (new.user_id, 1, 'poll_vote', new.post_id);
  return new;
end
$$;

create trigger poll_votes_count
  before insert on public.poll_votes
  for each row execute function public.on_poll_vote();

-- Admin: move a post along Submitted -> Seen -> Under consideration (fulfil via fulfill_post)
create or replace function public.set_post_status(p_post uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  p public.posts;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('open', 'seen', 'considering', 'removed') then
    raise exception 'Use fulfill_post to fulfil a request';
  end if;

  update public.posts set status = p_status where id = p_post returning * into p;
  if p.id is null then raise exception 'Post not found'; end if;

  if p.author_id is not null and p_status in ('seen', 'considering') then
    insert into public.notifications (user_id, kind, post_id, body)
    values (p.author_id, 'status_' || p_status, p.id,
            case p_status
              when 'seen' then 'Your request was seen by the creator.'
              else 'Your request is under consideration!'
            end);
  end if;
end
$$;

-- Admin: mark fulfilled with the YouTube video that answered it.
-- Author +500, every backer +50, everyone notified.
create or replace function public.fulfill_post(p_post uuid, p_video_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  p        public.posts;
  backers  integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select * into p from public.posts where id = p_post for update;
  if p.id is null then raise exception 'Post not found'; end if;
  if p.status = 'fulfilled' then raise exception 'Already fulfilled'; end if;

  update public.posts
  set status = 'fulfilled', fulfilled_video_id = p_video_id, fulfilled_at = now()
  where id = p.id;

  if p.author_id is not null then
    insert into public.points_ledger (user_id, amount, reason, ref_id)
    values (p.author_id, 500, 'request_fulfilled', p.id);
    insert into public.notifications (user_id, kind, post_id, body)
    values (p.author_id, 'fulfilled_author', p.id, 'Your idea got made! You earned 500 points.');
  end if;

  insert into public.points_ledger (user_id, amount, reason, ref_id)
  select u.user_id, 50, 'backed_fulfilled', p.id
  from public.post_upvotes u
  where u.post_id = p.id and u.user_id is distinct from p.author_id;
  get diagnostics backers = row_count;

  insert into public.notifications (user_id, kind, post_id, body)
  select u.user_id, 'fulfilled_backer', p.id, 'A request you backed just dropped. +50 points.'
  from public.post_upvotes u
  where u.post_id = p.id and u.user_id is distinct from p.author_id;

  return jsonb_build_object('backers_paid', backers);
end
$$;

-- Admin: pick a post for the weekly in-video segment
create or replace function public.set_featured(p_post uuid, p_week date)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.posts set featured_week = p_week where id = p_post;
end
$$;

-- Feed with a "hot" score (upvotes decayed by age) and joined display fields
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

-- ───────────────────────────── Row Level Security ─────────────────────────────

alter table public.profiles          enable row level security;
alter table public.creators          enable row level security;
alter table public.points_ledger     enable row level security;
alter table public.clips             enable row level security;
alter table public.clip_votes        enable row level security;
alter table public.brackets          enable row level security;
alter table public.bracket_matches   enable row level security;
alter table public.bracket_votes     enable row level security;
alter table public.themes            enable row level security;
alter table public.posts             enable row level security;
alter table public.post_upvotes      enable row level security;
alter table public.poll_votes        enable row level security;
alter table public.creator_summaries enable row level security;
alter table public.notifications     enable row level security;

-- Start from "read only" for API roles, then grant exactly the writable columns.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

create policy "profiles are public"        on public.profiles for select using (true);
create policy "edit own profile"           on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant update (display_name, avatar_url, fan_type, era) on public.profiles to authenticated;

create policy "creators are public"        on public.creators for select using (true);

create policy "see own points history"     on public.points_ledger for select to authenticated
  using (user_id = auth.uid());

create policy "active clips are public"    on public.clips for select
  using (status = 'active' or owner_id = auth.uid());
create policy "submit own clips"           on public.clips for insert to authenticated
  with check (owner_id = auth.uid());
grant insert (title, category, video_path, thumb_path, duration_s, orientation) on public.clips to authenticated;

create policy "see own clip votes"         on public.clip_votes for select to authenticated
  using (voter_id = auth.uid());

create policy "brackets are public"        on public.brackets        for select using (true);
create policy "bracket matches are public" on public.bracket_matches for select using (true);
create policy "bracket votes are public"   on public.bracket_votes   for select using (true);
create policy "cast own bracket vote"      on public.bracket_votes   for insert to authenticated
  with check (user_id = auth.uid());
grant insert (match_id, choice) on public.bracket_votes to authenticated;

create policy "themes are public"          on public.themes for select using (true);
create policy "summaries are public"       on public.creator_summaries for select using (true);

create policy "visible posts are public"   on public.posts for select using (status <> 'removed');
create policy "create own posts"           on public.posts for insert to authenticated
  with check (author_id = auth.uid() and source = 'platform' and status = 'open');
grant insert (type, body, creator_id) on public.posts to authenticated;

create policy "upvotes are public"         on public.post_upvotes for select using (true);
create policy "upvote as self"             on public.post_upvotes for insert to authenticated
  with check (user_id = auth.uid());
create policy "remove own upvote"          on public.post_upvotes for delete to authenticated
  using (user_id = auth.uid());
grant insert (post_id) on public.post_upvotes to authenticated;
grant delete on public.post_upvotes to authenticated;

create policy "poll votes are public"      on public.poll_votes for select using (true);
create policy "vote as self"               on public.poll_votes for insert to authenticated
  with check (user_id = auth.uid());
grant insert (post_id, choice) on public.poll_votes to authenticated;

create policy "see own notifications"      on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant update (read_at) on public.notifications to authenticated;

-- RPCs callable by signed-in users (admin ones check is_admin() inside)
revoke execute on function public.next_matchup(text)                                  from public, anon;
revoke execute on function public.cast_clip_vote(uuid, uuid, uuid, numeric, numeric)  from public, anon;
revoke execute on function public.create_bracket(text, integer, text)                 from public, anon;
revoke execute on function public.advance_bracket(uuid)                               from public, anon;
revoke execute on function public.set_post_status(uuid, text)                         from public, anon;
revoke execute on function public.fulfill_post(uuid, text)                            from public, anon;
revoke execute on function public.set_featured(uuid, date)                            from public, anon;
grant  execute on function public.next_matchup(text)                                  to authenticated;
grant  execute on function public.cast_clip_vote(uuid, uuid, uuid, numeric, numeric)  to authenticated;
grant  execute on function public.create_bracket(text, integer, text)                 to authenticated;
grant  execute on function public.advance_bracket(uuid)                               to authenticated;
grant  execute on function public.set_post_status(uuid, text)                         to authenticated;
grant  execute on function public.fulfill_post(uuid, text)                            to authenticated;
grant  execute on function public.set_featured(uuid, date)                            to authenticated;

-- ───────────────────────────── Realtime ─────────────────────────────

alter publication supabase_realtime add table public.posts, public.bracket_matches;

-- ───────────────────────────── Storage ─────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clips',  'clips',  true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('thumbs', 'thumbs', true, 5242880,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Uploads go in a folder named after the uploader's user id: clips/<uid>/<file>
create policy "upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('clips', 'thumbs')
    and (storage.foldername(name))[1] = auth.uid()::text);
