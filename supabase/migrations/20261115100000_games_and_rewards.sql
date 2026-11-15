-- Games (Guess the Views, daily Guess the Member) and the Rewards store.
-- Same write model as the core schema: clients write through narrow grants or validating functions;
-- points only move through points_ledger.

-- ───────────────────────────── Guess the Views ─────────────────────────────

create table public.view_rounds (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,                 -- e.g. "FaZe Clan's next main-channel upload"
  creator_id   text references public.creators (id) on delete set null,
  video_id     text,                          -- YouTube id, once the video is out
  locks_at     timestamptz not null,          -- guessing closes (usually at the drop)
  status       text not null default 'open' check (status in ('open', 'resolved')),
  final_views  bigint,                        -- views 7 days after the drop
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table public.view_guesses (
  round_id    uuid not null references public.view_rounds (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  guess       bigint not null check (guess > 0 and guess < 10000000000),
  created_at  timestamptz not null default now(),
  primary key (round_id, user_id)
);

create or replace function public.on_view_guess()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  r public.view_rounds;
begin
  select * into r from public.view_rounds where id = new.round_id;
  if r.id is null or r.status <> 'open' or now() >= r.locks_at then
    raise exception 'Guessing is closed for this round';
  end if;
  new.created_at := now();
  return new;
end
$$;

create trigger view_guesses_check
  before insert on public.view_guesses
  for each row execute function public.on_view_guess();

-- Public stats without exposing individual guesses before the result
create or replace function public.view_round_stats(p_round uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('guesses', count(*)) from public.view_guesses where round_id = p_round
$$;

-- Results (only once resolved): closest first, ties go to the earlier guess
create or replace function public.view_round_results(p_round uuid)
returns table (rank bigint, username text, guess bigint, off_by bigint, points integer)
language sql stable security definer set search_path = public
as $$
  with r as (select * from public.view_rounds where id = p_round and status = 'resolved'),
  ranked as (
    select g.user_id, g.guess, abs(g.guess - r.final_views) as off_by,
           row_number() over (order by abs(g.guess - r.final_views), g.created_at) as rank
    from public.view_guesses g, r
    where g.round_id = r.id
  )
  select ranked.rank, p.username, ranked.guess, ranked.off_by,
         case when ranked.rank = 1 then 1000 when ranked.rank = 2 then 500
              when ranked.rank = 3 then 300 when ranked.rank <= 10 then 100 else 0 end
  from ranked join public.profiles p on p.id = ranked.user_id
  order by ranked.rank
  limit 50
$$;

-- Admin: enter the 7-day view count; pays the top 10 (1000 / 500 / 300 / 100 x7) and notifies them
create or replace function public.resolve_view_round(p_round uuid, p_final_views bigint, p_video_id text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r     public.view_rounds;
  paid  integer;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into r from public.view_rounds where id = p_round for update;
  if r.id is null then raise exception 'Round not found'; end if;
  if r.status = 'resolved' then raise exception 'Already resolved'; end if;
  if p_final_views is null or p_final_views <= 0 then raise exception 'Enter the final view count'; end if;

  update public.view_rounds
  set status = 'resolved', final_views = p_final_views, resolved_at = now(),
      video_id = coalesce(p_video_id, video_id), locks_at = least(locks_at, now())
  where id = r.id;

  with ranked as (
    select g.user_id,
           row_number() over (order by abs(g.guess - p_final_views), g.created_at) as rank
    from public.view_guesses g where g.round_id = r.id
  ),
  winners as (
    select user_id, rank,
           case when rank = 1 then 1000 when rank = 2 then 500 when rank = 3 then 300 else 100 end as pts
    from ranked where rank <= 10
  ),
  ledger as (
    insert into public.points_ledger (user_id, amount, reason, ref_id)
    select user_id, pts, 'view_guess', r.id from winners
    returning user_id
  )
  insert into public.notifications (user_id, kind, body)
  select w.user_id, 'view_guess_win',
         format('You placed #%s in Guess the Views: %s! +%s points.', w.rank, r.title, w.pts)
  from winners w;
  get diagnostics paid = row_count;

  return jsonb_build_object('winners_paid', paid);
end
$$;

-- ───────────────────────────── Guess the Member (daily) ─────────────────────────────

create table public.faze_members (
  id           text primary key,
  name         text not null,
  joined_year  integer not null,
  era          text not null check (era in ('Trickshot era', 'Vlog era', 'Modern era')),
  known_for    text not null,
  founder      boolean not null default false,
  sort         integer not null default 0
);

create table public.member_guesses (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  day         date not null,
  attempt     integer not null check (attempt between 1 and 6),
  member_id   text not null references public.faze_members (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, day, attempt)
);

-- The puzzle day turns over at midnight US Central (HackUTA is in Arlington, TX)
create or replace function public.puzzle_day()
returns date
language sql stable
as $$ select (now() at time zone 'America/Chicago')::date $$;

-- Today's answer. Not callable by clients (would leak the answer).
create or replace function public.daily_member_id(p_day date)
returns text
language sql stable security definer set search_path = public
as $$
  select id from public.faze_members
  order by id
  offset (abs(hashtext('faze-now:' || p_day::text)) % greatest((select count(*) from public.faze_members), 1))
  limit 1
$$;

create or replace function public.member_feedback(p_guess text, p_answer text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'member', g.id,
    'name', g.name,
    'joined_year', g.joined_year,
    'joined', case when g.joined_year = a.joined_year then 'exact'
                   when g.joined_year < a.joined_year then 'later' else 'earlier' end,
    'era', g.era, 'era_match', g.era = a.era,
    'known_for', g.known_for, 'known_for_match', g.known_for = a.known_for,
    'founder', g.founder, 'founder_match', g.founder = a.founder,
    'correct', g.id = a.id)
  from public.faze_members g, public.faze_members a
  where g.id = p_guess and a.id = p_answer
$$;

-- State of today's game for the caller (restores the board on reload)
create or replace function public.my_member_game()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v       uuid := auth.uid();
  d       date := public.puzzle_day();
  answer  text := public.daily_member_id(d);
  rows    jsonb;
  solved  boolean;
  n       integer;
begin
  if v is null then raise exception 'Sign in to play' using errcode = '28000'; end if;
  select coalesce(jsonb_agg(public.member_feedback(member_id, answer) order by attempt), '[]'::jsonb),
         coalesce(bool_or(member_id = answer), false), count(*)
  into rows, solved, n
  from public.member_guesses where user_id = v and day = d;

  return jsonb_build_object(
    'day', d, 'guesses', rows, 'solved', solved, 'max', 6,
    'answer', case when solved or n >= 6 then (select name from public.faze_members where id = answer) end);
end
$$;

create or replace function public.guess_member(p_member text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v       uuid := auth.uid();
  d       date := public.puzzle_day();
  answer  text := public.daily_member_id(d);
  n       integer;
  fb      jsonb;
  pts     integer := 0;
begin
  if v is null then raise exception 'Sign in to play' using errcode = '28000'; end if;
  if not exists (select 1 from public.faze_members where id = p_member) then
    raise exception 'Pick a FaZe member from the list';
  end if;
  if exists (select 1 from public.member_guesses where user_id = v and day = d and member_id = answer) then
    raise exception 'You already solved today''s puzzle. Come back tomorrow!';
  end if;
  if exists (select 1 from public.member_guesses where user_id = v and day = d and member_id = p_member) then
    raise exception 'You already guessed that one';
  end if;

  select count(*) into n from public.member_guesses where user_id = v and day = d;
  if n >= 6 then raise exception 'Out of guesses for today. Come back tomorrow!'; end if;

  insert into public.member_guesses (user_id, day, attempt, member_id) values (v, d, n + 1, p_member);
  fb := public.member_feedback(p_member, answer);

  if p_member = answer then
    pts := 60 - 10 * n; -- 60 on the first try down to 10 on the sixth
    insert into public.points_ledger (user_id, amount, reason) values (v, pts, 'daily_member');
  end if;

  return fb || jsonb_build_object(
    'attempt', n + 1,
    'points', pts,
    'answer', case when p_member = answer or n + 1 >= 6 then (select name from public.faze_members where id = answer) end);
end
$$;

-- ───────────────────────────── Rewards ─────────────────────────────

create table public.rewards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  cost         integer not null check (cost > 0),
  stock        integer check (stock is null or stock >= 0),   -- null = unlimited
  kind         text not null check (kind in ('digital', 'merch', 'experience')),
  active       boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.redemptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  reward_id   uuid not null references public.rewards (id) on delete restrict,
  cost        integer not null,
  code        text not null unique,
  status      text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  created_at  timestamptz not null default now()
);
create index redemptions_user_idx on public.redemptions (user_id, created_at desc);

-- Atomic: lock balance + stock, deduct, record, notify. Can't overspend or oversell.
create or replace function public.redeem_reward(p_reward uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v     uuid := auth.uid();
  bal   integer;
  rw    public.rewards;
  code  text;
  rid   uuid;
begin
  if v is null then raise exception 'Sign in to redeem' using errcode = '28000'; end if;

  select points into bal from public.profiles where id = v for update;
  select * into rw from public.rewards where id = p_reward for update;
  if rw.id is null or not rw.active then raise exception 'That reward isn''t available'; end if;
  if rw.stock is not null and rw.stock <= 0 then raise exception 'Sold out'; end if;
  if bal < rw.cost then
    raise exception 'You need % more points', rw.cost - bal;
  end if;

  if rw.stock is not null then
    update public.rewards set stock = stock - 1 where id = rw.id;
  end if;

  code := 'FAZE-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
  insert into public.redemptions (user_id, reward_id, cost, code)
  values (v, rw.id, rw.cost, code)
  returning id into rid;

  insert into public.points_ledger (user_id, amount, reason, ref_id) values (v, -rw.cost, 'redeem', rid);
  insert into public.notifications (user_id, kind, body)
  values (v, 'redeemed', format('You redeemed "%s". Your code: %s', rw.title, code));

  return jsonb_build_object('code', code, 'redemption', rid, 'balance', bal - rw.cost);
end
$$;

-- ───────────────────────────── RLS + grants ─────────────────────────────

alter table public.view_rounds    enable row level security;
alter table public.view_guesses   enable row level security;
alter table public.faze_members   enable row level security;
alter table public.member_guesses enable row level security;
alter table public.rewards        enable row level security;
alter table public.redemptions    enable row level security;

revoke insert, update, delete, truncate on
  public.view_rounds, public.view_guesses, public.faze_members, public.member_guesses,
  public.rewards, public.redemptions
from anon, authenticated;

create policy "rounds are public"        on public.view_rounds  for select using (true);
create policy "see own view guess"       on public.view_guesses for select to authenticated using (user_id = auth.uid());
create policy "guess as self"            on public.view_guesses for insert to authenticated with check (user_id = auth.uid());
grant insert (round_id, guess) on public.view_guesses to authenticated;

create policy "members are public"       on public.faze_members   for select using (true);
create policy "see own member guesses"   on public.member_guesses for select to authenticated using (user_id = auth.uid());

create policy "active rewards are public" on public.rewards     for select using (active);
create policy "see own redemptions"       on public.redemptions for select to authenticated using (user_id = auth.uid());

revoke execute on function public.daily_member_id(date)          from public, anon, authenticated;
revoke execute on function public.member_feedback(text, text)    from public, anon, authenticated;
revoke execute on function public.my_member_game()               from public, anon;
revoke execute on function public.guess_member(text)             from public, anon;
revoke execute on function public.redeem_reward(uuid)            from public, anon;
revoke execute on function public.resolve_view_round(uuid, bigint, text) from public, anon;
grant  execute on function public.my_member_game()               to authenticated;
grant  execute on function public.guess_member(text)             to authenticated;
grant  execute on function public.redeem_reward(uuid)            to authenticated;
grant  execute on function public.resolve_view_round(uuid, bigint, text) to authenticated;

alter publication supabase_realtime add table public.view_rounds;

-- ───────────────────────────── Starter data ─────────────────────────────

-- Member facts. Joined years for Rug (2013) and Swagg (2020) are from FaZe's own challenge
-- brief; the rest should be checked before the demo (edit this table, no code changes needed).
insert into public.faze_members (id, name, joined_year, era, known_for, founder, sort) values
  ('apex',     'FaZe Apex',     2010, 'Trickshot era', 'Trickshots', true,  1),
  ('temperrr', 'FaZe Temperrr', 2010, 'Trickshot era', 'Trickshots', true,  2),
  ('banks',    'FaZe Banks',    2012, 'Trickshot era', 'Vlogs',      false, 3),
  ('rug',      'FaZe Rug',      2013, 'Trickshot era', 'Vlogs',      false, 4),
  ('adapt',    'FaZe Adapt',    2016, 'Vlog era',      'Vlogs',      false, 5),
  ('kay',      'FaZe Kay',      2016, 'Vlog era',      'Streaming',  false, 6),
  ('jarvis',   'FaZe Jarvis',   2018, 'Vlog era',      'Fortnite',   false, 7),
  ('swagg',    'FaZe Swagg',    2020, 'Modern era',    'Warzone',    false, 8),
  ('snoop',    'Snoop Dogg',    2022, 'Modern era',    'Music',      false, 9)
on conflict (id) do nothing;

insert into public.rewards (title, description, cost, stock, kind, sort) values
  ('Day One badge',                   'A profile badge that shows you were here for season one.',                    150,  null, 'digital',    1),
  ('10% off FaZe merch',              'A one-time discount code for the FaZe store.',                                500,  null, 'merch',      2),
  ('Early access: next merch drop',   'Shop the next drop 24 hours before everyone else.',                           1500, 100,  'merch',      3),
  ('Your name in the credits',        'Your username in the end credits of a FaZe upload.',                          3000, 25,   'experience', 4),
  ('Shoutout in a FaZe video',        'A creator shouts you out by name in an upload.',                              5000, 10,   'experience', 5),
  ('Your clip in the official montage','Your Clip Court clip featured in FaZe''s season montage.',                    7500, 5,    'experience', 6),
  ('Signed FaZe jersey',              'A jersey signed by the roster, shipped to you.',                              10000, 3,   'merch',      7),
  ('A day at FaZe',                   'Visit FaZe for a day and hang out on set during a shoot.',                    25000, 1,   'experience', 8);
