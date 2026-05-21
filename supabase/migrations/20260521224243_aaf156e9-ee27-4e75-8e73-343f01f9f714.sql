
-- Enums
CREATE TYPE public.host_role AS ENUM ('host', 'checker');
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted', 'private');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE public.rsvp_status AS ENUM ('going', 'interested', 'not_going');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hosts (orgs / creators)
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  website TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Host members
CREATE TABLE public.host_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.host_role NOT NULL DEFAULT 'host',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (host_id, user_id, role)
);
CREATE INDEX idx_host_members_user ON public.host_members(user_id);
CREATE INDEX idx_host_members_host ON public.host_members(host_id);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_host_role(_user_id UUID, _host_id UUID, _role public.host_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE user_id = _user_id AND host_id = _host_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_host_member(_user_id UUID, _host_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_members
    WHERE user_id = _user_id AND host_id = _host_id
  );
$$;

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  capacity INT,
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  status public.event_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (host_id, slug)
);
CREATE INDEX idx_events_host ON public.events(host_id);
CREATE INDEX idx_events_start ON public.events(start_at);
CREATE INDEX idx_events_status_vis ON public.events(status, visibility);

-- RSVPs
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_rsvps_user ON public.rsvps(user_id);

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);

-- Checkins
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  checked_in_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id)
);

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Gallery photos
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  host_id UUID REFERENCES public.hosts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hosts_updated BEFORE UPDATE ON public.hosts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rsvps_updated BEFORE UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Hosts policies
CREATE POLICY "Hosts viewable by all" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "Authenticated can create hosts" ON public.hosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Host role can update host" ON public.hosts FOR UPDATE USING (public.has_host_role(auth.uid(), id, 'host'));
CREATE POLICY "Host role can delete host" ON public.hosts FOR DELETE USING (public.has_host_role(auth.uid(), id, 'host'));

-- Host members policies
CREATE POLICY "Members viewable by host members" ON public.host_members FOR SELECT USING (public.is_host_member(auth.uid(), host_id) OR user_id = auth.uid());
CREATE POLICY "Host role can manage members" ON public.host_members FOR ALL USING (public.has_host_role(auth.uid(), host_id, 'host')) WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'));

-- Events policies
CREATE POLICY "Public events viewable by all" ON public.events FOR SELECT USING (
  (status = 'published' AND visibility IN ('public', 'unlisted')) OR public.is_host_member(auth.uid(), host_id)
);
CREATE POLICY "Host members manage events" ON public.events FOR ALL USING (public.has_host_role(auth.uid(), host_id, 'host')) WITH CHECK (public.has_host_role(auth.uid(), host_id, 'host'));

-- RSVPs policies
CREATE POLICY "Users view own RSVPs" ON public.rsvps FOR SELECT USING (user_id = auth.uid() OR public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id)));
CREATE POLICY "Users manage own RSVPs" ON public.rsvps FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tickets policies
CREATE POLICY "Users view own tickets" ON public.tickets FOR SELECT USING (user_id = auth.uid() OR public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id)));
CREATE POLICY "Users create own tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Checkins policies
CREATE POLICY "Host members view checkins" ON public.checkins FOR SELECT USING (public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id)));
CREATE POLICY "Host members create checkins" ON public.checkins FOR INSERT TO authenticated WITH CHECK (public.is_host_member(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id)));

-- Feedback policies
CREATE POLICY "Feedback viewable by all" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Users manage own feedback" ON public.feedback FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Gallery policies
CREATE POLICY "Gallery viewable by all" ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated upload gallery" ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader or host can delete" ON public.gallery_photos FOR DELETE USING (auth.uid() = uploaded_by OR public.has_host_role(auth.uid(), (SELECT host_id FROM public.events WHERE id = event_id), 'host'));

-- Reports policies
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "Authenticated submit reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
