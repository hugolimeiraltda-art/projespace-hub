
-- Make project-attachments bucket public so stored URLs work
UPDATE storage.buckets SET public = true WHERE id = 'project-attachments';

-- Make customer-documents bucket public so stored URLs work  
UPDATE storage.buckets SET public = true WHERE id = 'customer-documents';

-- Make orcamento-midias bucket public so stored URLs work
UPDATE storage.buckets SET public = true WHERE id = 'orcamento-midias';
