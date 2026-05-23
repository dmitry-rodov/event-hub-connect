-- Add 'checker' value to host_role enum if it doesn't exist
ALTER TYPE public.host_role ADD VALUE IF NOT EXISTS 'checker';

-- Ensure tickets <-> checkins uniqueness so duplicate scans are blocked at DB level
CREATE UNIQUE INDEX IF NOT EXISTS checkins_ticket_id_unique ON public.checkins(ticket_id);