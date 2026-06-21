-- 1. Add Pattera terms accepted flag to profiles (users)
ALTER TABLE public.profiles ADD COLUMN pattera_terms_accepted boolean DEFAULT false;

-- 2. Create Pattera logs table for Accept/Deny workflow
CREATE TABLE public.pattera_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    suggestion text,
    accepted boolean,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pattera_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own logs" ON public.pattera_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON public.pattera_logs FOR SELECT USING (auth.uid() = user_id);