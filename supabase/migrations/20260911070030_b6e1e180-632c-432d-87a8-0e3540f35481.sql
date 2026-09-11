CREATE POLICY "parcel photos staff upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parcel-photos' AND public.is_staff(auth.uid()));
CREATE POLICY "parcel photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'parcel-photos');
CREATE POLICY "parcel photos staff update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'parcel-photos' AND public.is_staff(auth.uid()));