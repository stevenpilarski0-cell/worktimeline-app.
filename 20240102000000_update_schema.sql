 a-- 1. Create Multi-Tenant Clio Tokens Storage
CREATE TABLE public.clio_tokens (
    user_id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_in integer,
    id_token text,
    token_type text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.clio_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Create Lawyer Notes Storage (For page.tsx persistence)
CREATE TABLE public.lawyer_notes (
    user_id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    notes text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.lawyer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can update own notes" ON public.lawyer_notes FOR ALL USING (auth.uid() = user_id);

-- 3. Create Clio Jobs Queue
CREATE TABLE public.clio_jobs (
    job_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    status text DEFAULT 'pending',
    payload jsonb,
    result jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);