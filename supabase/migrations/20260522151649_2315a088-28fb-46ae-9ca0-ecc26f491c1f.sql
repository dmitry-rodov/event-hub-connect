DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_type') THEN
    CREATE TYPE public.venue_type AS ENUM ('physical', 'online');
  END IF;
END$$;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue_type public.venue_type NOT NULL DEFAULT 'physical';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS online_url text;