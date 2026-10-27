-- Tighten unit visibility and audit-log insert rules
DROP POLICY IF EXISTS "units readable" ON public.units;
CREATE POLICY "units readable" ON public.units FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR id IN (SELECT public.my_unit_ids()));

DROP POLICY IF EXISTS "audit insert" ON public.audit_log;
CREATE POLICY "audit insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
