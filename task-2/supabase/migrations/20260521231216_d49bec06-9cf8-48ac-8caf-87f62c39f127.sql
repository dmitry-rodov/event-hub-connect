ALTER TABLE public.tickets
  ALTER COLUMN code SET DEFAULT 'EVT-' || upper(substring(encode(extensions.gen_random_bytes(8), 'hex') from 1 for 8));

UPDATE public.tickets
SET code = 'EVT-' || upper(substring(encode(extensions.gen_random_bytes(8), 'hex') from 1 for 8))
WHERE code !~ '^EVT-[A-Z0-9]{8}$';