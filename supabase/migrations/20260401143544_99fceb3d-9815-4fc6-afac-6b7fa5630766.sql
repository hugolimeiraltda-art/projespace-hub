ALTER TABLE public.manutencao_chamados ADD COLUMN IF NOT EXISTS laudo_fotos TEXT[] DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public) VALUES ('manutencao-laudos', 'manutencao-laudos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload laudos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'manutencao-laudos');
CREATE POLICY "Anyone can view laudos" ON storage.objects FOR SELECT USING (bucket_id = 'manutencao-laudos');
CREATE POLICY "Authenticated users can delete laudos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'manutencao-laudos');