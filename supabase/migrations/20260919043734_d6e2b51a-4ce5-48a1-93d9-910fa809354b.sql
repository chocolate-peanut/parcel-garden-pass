DROP POLICY IF EXISTS "guards read" ON public.guards;
CREATE POLICY "guards read" ON public.guards FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "parcel photos read" ON storage.objects;
CREATE POLICY "parcel photos read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'parcel-photos'
    AND (
      public.is_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.parcels p
        WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
          AND p.unit_id IN (SELECT public.my_unit_ids())
      )
    )
  );