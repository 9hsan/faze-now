-- Creators fans can tag in The Call. Roster is editable; YouTube channel ids are filled in later
-- from the YouTube Data API.
insert into public.creators (id, name, sort) values
  ('faze',     'FaZe Clan',     0),
  ('rug',      'FaZe Rug',      1),
  ('swagg',    'FaZe Swagg',    2),
  ('banks',    'FaZe Banks',    3),
  ('adapt',    'FaZe Adapt',    4),
  ('jarvis',   'FaZe Jarvis',   5),
  ('kay',      'FaZe Kay',      6),
  ('apex',     'FaZe Apex',     7),
  ('temperrr', 'FaZe Temperrr', 8)
on conflict (id) do nothing;
