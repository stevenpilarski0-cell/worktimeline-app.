-- 1. Create a secure, private bucket for evidence uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence_vault', 'evidence_vault', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS Policies for the storage.objects table
-- Allow users to upload their own evidence (Supabase automatically sets the "owner" to auth.uid() upon insert)
CREATE POLICY "Users can upload their own evidence" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'evidence_vault' 
    AND auth.uid() = owner
);

-- Allow users to view/download only their own evidence files
CREATE POLICY "Users can view their own evidence" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'evidence_vault' 
    AND auth.uid() = owner
);

-- Allow users to delete their own evidence (e.g., if they cancel an amendment or reset their timeline)
CREATE POLICY "Users can delete their own evidence" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'evidence_vault' 
    AND auth.uid() = owner
);