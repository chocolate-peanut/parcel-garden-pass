-- ROLES
CREATE TYPE public.app_role AS ENUM ('guard','resident','admin');
CREATE TYPE public.parcel_status AS ENUM ('registered','stored','notified','claimed','disputed','escalated','returned');
CREATE TYPE public.actor_type AS ENUM ('guard','resident','admin','system');
CREATE TYPE public.dispute_resolution AS ENUM ('open','accepted','rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- CORE TABLES
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number text NOT NULL,
  floor int NOT NULL DEFAULT 1,
  building text NOT NULL DEFAULT 'A',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building, unit_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  user_id uuid,
  name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX residents_user_idx ON public.residents(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.residents TO authenticated;
GRANT ALL ON public.residents TO service_role;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.guards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  shift text NOT NULL DEFAULT 'day',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guards TO authenticated;
GRANT ALL ON public.guards TO service_role;
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL,
  shelf_code text NOT NULL,
  capacity int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone, shelf_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_locations TO authenticated;
GRANT ALL ON public.storage_locations TO service_role;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  storage_id uuid REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  guard_id_in uuid REFERENCES public.guards(id) ON DELETE SET NULL,
  parcel_identifier text,
  status public.parcel_status NOT NULL DEFAULT 'registered',
  condition_flag boolean NOT NULL DEFAULT false,
  condition_note text,
  photo_url text,
  intake_ts timestamptz NOT NULL DEFAULT now(),
  claim_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12),'hex'),
  token_used boolean NOT NULL DEFAULT false,
  qr_expiry_ts timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  claimed_by_name text,
  is_proxy_claim boolean NOT NULL DEFAULT false,
  claim_ts timestamptz,
  dispute_status public.dispute_resolution,
  dispute_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parcels_unit_idx ON public.parcels(unit_id);
CREATE INDEX parcels_status_idx ON public.parcels(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated;
GRANT ALL ON public.parcels TO service_role;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
  actor_type public.actor_type NOT NULL DEFAULT 'system',
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  details text,
  "timestamp" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_parcel_idx ON public.audit_log(parcel_id);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unit_idx ON public.notifications(unit_id);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- HELPER: units belonging to current resident
CREATE OR REPLACE FUNCTION public.my_unit_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.residents WHERE user_id = auth.uid() AND unit_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('guard','admin'))
$$;

-- POLICIES
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "units readable" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units admin write" ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "residents read" ON public.residents FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "residents admin write" ON public.residents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "guards read" ON public.guards FOR SELECT TO authenticated USING (true);
CREATE POLICY "guards self insert" ON public.guards FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "guards admin write" ON public.guards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "couriers read" ON public.couriers FOR SELECT TO authenticated USING (true);
CREATE POLICY "couriers staff write" ON public.couriers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "storage read" ON public.storage_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "storage admin write" ON public.storage_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "parcels staff read" ON public.parcels FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR unit_id IN (SELECT public.my_unit_ids()));
CREATE POLICY "parcels staff insert" ON public.parcels FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "parcels staff update" ON public.parcels FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "parcels admin delete" ON public.parcels FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "audit read" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR parcel_id IN (SELECT id FROM public.parcels WHERE unit_id IN (SELECT public.my_unit_ids())));
CREATE POLICY "audit insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR unit_id IN (SELECT public.my_unit_ids()) OR public.is_staff(auth.uid()));
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR unit_id IN (SELECT public.my_unit_ids()))
  WITH CHECK (user_id = auth.uid() OR unit_id IN (SELECT public.my_unit_ids()));

-- SIGNUP HANDLING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'resident');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _role = 'resident' THEN
    UPDATE public.residents SET user_id = NEW.id
    WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  ELSIF _role = 'guard' THEN
    INSERT INTO public.guards (user_id, name, shift)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name','Guard'), COALESCE(NEW.raw_user_meta_data->>'shift','day'));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED reference data
INSERT INTO public.units (unit_number, floor, building) VALUES
 ('A-01-01',1,'A'),('A-02-03',2,'A'),('A-05-12',5,'A'),('B-03-07',3,'B'),('B-11-02',11,'B');
INSERT INTO public.storage_locations (zone, shelf_code, capacity) VALUES
 ('Lobby','L-01',12),('Lobby','L-02',12),('Back Room','B-01',24),('Cold Shelf','C-01',6),('Oversize','O-01',4);
INSERT INTO public.couriers (company_name) VALUES ('DHL'),('J&T Express'),('Ninja Van'),('Pos Laju'),('Lalamove');