-- AI creator briefs: record which model wrote a brief, and apply a generated grouping atomically.

alter table public.creator_summaries add column model text; -- null = hand-written sample

-- Replaces a creator's themes with an AI grouping and upserts this week's brief.
-- p_themes: [{ "label": text, "summary": text, "post_ids": [uuid, ...] }, ...]
-- Callable by admins (from the dashboard button) or the service role (local scripts).
create or replace function public.apply_creator_brief(
  p_creator text,
  p_themes  jsonb,
  p_summary text,
  p_model   text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t        jsonb;
  ids      uuid[];
  tid      uuid;
  n_themes integer := 0;
  week     date := date_trunc('week', now() at time zone 'UTC')::date; -- ISO Monday
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'Admins only';
  end if;
  if not exists (select 1 from public.creators where id = p_creator) then
    raise exception 'Unknown creator';
  end if;
  if jsonb_typeof(p_themes) <> 'array' or jsonb_array_length(p_themes) = 0 then
    raise exception 'No themes to apply';
  end if;
  if coalesce(trim(p_summary), '') = '' then
    raise exception 'Empty brief';
  end if;

  -- Old themes go; posts.theme_id is cleared by the FK (on delete set null)
  delete from public.themes where creator_id = p_creator;

  for t in select * from jsonb_array_elements(p_themes) loop
    -- Only this creator's live posts can be placed in its themes
    select coalesce(array_agg(p.id), '{}') into ids
    from public.posts p
    where p.creator_id = p_creator
      and p.status <> 'removed'
      and p.theme_id is null
      and p.id in (select (jsonb_array_elements_text(t -> 'post_ids'))::uuid);

    continue when coalesce(array_length(ids, 1), 0) = 0;

    insert into public.themes (creator_id, label, summary, post_count, total_support)
    select p_creator, left(trim(t ->> 'label'), 60), nullif(trim(t ->> 'summary'), ''),
           count(*), coalesce(sum(upvote_count), 0)
    from public.posts where id = any (ids)
    returning id into tid;

    update public.posts set theme_id = tid where id = any (ids);
    n_themes := n_themes + 1;
  end loop;

  insert into public.creator_summaries (creator_id, week_of, summary, generated_at, model)
  values (p_creator, week, trim(p_summary), now(), p_model)
  on conflict (creator_id, week_of)
  do update set summary = excluded.summary, generated_at = excluded.generated_at, model = excluded.model;

  return jsonb_build_object('themes', n_themes, 'week_of', week);
end
$$;

revoke execute on function public.apply_creator_brief(text, jsonb, text, text) from public, anon;
grant  execute on function public.apply_creator_brief(text, jsonb, text, text) to authenticated, service_role;
