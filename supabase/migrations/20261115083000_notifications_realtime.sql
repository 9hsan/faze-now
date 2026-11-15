-- Deliver notifications live (RLS still limits each user to their own rows).
alter publication supabase_realtime add table public.notifications;
