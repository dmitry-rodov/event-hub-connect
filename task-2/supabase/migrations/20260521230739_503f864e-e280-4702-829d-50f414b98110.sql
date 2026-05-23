
-- Extend RSVP status with waitlist + cancelled
DO $$ BEGIN
  ALTER TYPE public.rsvp_status ADD VALUE IF NOT EXISTS 'waitlist';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.rsvp_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Queue position for waitlisted RSVPs
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS queue_position INTEGER;

-- Unique constraint: one RSVP row per user/event (RLS already prevents foreign user writes)
DO $$ BEGIN
  ALTER TABLE public.rsvps ADD CONSTRAINT rsvps_event_user_unique UNIQUE (event_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tickets ADD CONSTRAINT tickets_event_user_unique UNIQUE (event_id, user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
